import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  writeBatch,
  Firestore,
} from "firebase/firestore";
import { db } from "../firebase/client";
import {
  FamilyRepository,
  DuplicateCandidate,
  MergeResult,
  BackupPayload,
} from "./repository";
import { Person, PersonInput } from "../../domain/models/person";
import { Relationship, RelationshipInput } from "../../domain/models/relationship";
import { Branch, BranchInput } from "../../domain/models/branch";
import { NamingPreferences, KinshipOverride, KinshipOverrideInput, defaultSouthernNamingPreferences } from "../../domain/models/naming";
import { AuditLog } from "../../domain/models/audit";
import { FamilyGraph } from "../../domain/graph/familyGraph";
import { GraphCycleDetector } from "../../domain/graph/graphCycleDetector";
import {
  initialPersons,
  initialRelationships,
  initialBranches,
  initialOverrides,
} from "./sampleData";

/**
 * Removes any undefined fields recursively so Firestore setDoc / updateDoc won't throw
 * "Function setDoc() called with invalid data. Unsupported field value: undefined"
 */
function cleanForFirestore<T>(data: T): Record<string, unknown> {
  return JSON.parse(JSON.stringify(data));
}

export class FirestoreRepository implements FamilyRepository {
  private spaceId: string;
  private firestore: Firestore;

  constructor(spaceId: string = "default-space") {
    this.spaceId = spaceId;
    if (!db) {
      throw new Error("Firebase Firestore chưa được khởi tạo. Vui lòng kiểm tra biến môi trường.");
    }
    this.firestore = db;
  }

  private getCollectionPath(subCollection: string) {
    return `familySpaces/${this.spaceId}/${subCollection}`;
  }

  // --- PERSONS ---
  async getPerson(id: string): Promise<Person | null> {
    const ref = doc(this.firestore, this.getCollectionPath("persons"), id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as Person;
  }

  async getAllPersons(includeArchived: boolean = false): Promise<Person[]> {
    const colRef = collection(this.firestore, this.getCollectionPath("persons"));
    const snap = await getDocs(colRef);
    const persons = snap.docs.map(d => d.data() as Person);
    if (includeArchived) return persons;
    return persons.filter(p => !p.notes?.includes("[ARCHIVED]"));
  }

  async createPerson(input: PersonInput): Promise<Person> {
    const id = input.id || `person-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newPerson: Person = {
      ...input,
      id,
      gender: input.gender || "unknown",
      livingStatus: input.livingStatus || "living",
      createdAt: input.createdAt || now,
      updatedAt: now,
      createdBy: input.createdBy || "admin",
      branchIds: input.branchIds || ["branch-root"],
      visibility: input.visibility || { isPublic: true },
    };

    const ref = doc(this.firestore, this.getCollectionPath("persons"), id);
    await setDoc(ref, cleanForFirestore(newPerson));

    await this.recordAuditLog({
      action: "CREATE_PERSON",
      entityType: "person",
      entityId: id,
      description: `Thêm thành viên mới: ${newPerson.fullName}`,
      performedBy: newPerson.createdBy,
      newState: newPerson,
    });

    return newPerson;
  }

  async updatePerson(id: string, updates: Partial<PersonInput>): Promise<Person> {
    const existing = await this.getPerson(id);
    if (!existing) throw new Error(`Không tìm thấy thành viên: ${id}`);

    const updated: Person = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    const ref = doc(this.firestore, this.getCollectionPath("persons"), id);
    await updateDoc(ref, cleanForFirestore(updated));

    await this.recordAuditLog({
      action: "UPDATE_PERSON",
      entityType: "person",
      entityId: id,
      description: `Cập nhật thông tin thành viên: ${updated.fullName}`,
      performedBy: updates.createdBy || "admin",
      previousState: existing,
      newState: updated,
    });

    return updated;
  }

  async deletePerson(id: string): Promise<void> {
    const existing = await this.getPerson(id);
    if (!existing) return;

    const ref = doc(this.firestore, this.getCollectionPath("persons"), id);
    await deleteDoc(ref);

    // Clean up related relationships
    const rels = await this.getAllRelationships();
    const batch = writeBatch(this.firestore);
    for (const r of rels) {
      if (r.fromPersonId === id || r.toPersonId === id) {
        batch.delete(doc(this.firestore, this.getCollectionPath("relationships"), r.id));
      }
    }
    await batch.commit();

    await this.recordAuditLog({
      action: "DELETE_PERSON",
      entityType: "person",
      entityId: id,
      description: `Xóa thành viên: ${existing.fullName} cùng các liên kết liên đới`,
      performedBy: "admin",
      previousState: existing,
    });
  }

  async archivePerson(id: string): Promise<void> {
    const existing = await this.getPerson(id);
    if (!existing) return;
    const notes = (existing.notes || "") + " [ARCHIVED]";
    await this.updatePerson(id, { notes });
  }

  async restorePerson(id: string): Promise<void> {
    const existing = await this.getPerson(id);
    if (!existing) return;
    const notes = (existing.notes || "").replace("[ARCHIVED]", "").trim();
    await this.updatePerson(id, { notes });
  }

  // --- RELATIONSHIPS ---
  async getRelationship(id: string): Promise<Relationship | null> {
    const ref = doc(this.firestore, this.getCollectionPath("relationships"), id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as Relationship;
  }

  async getAllRelationships(): Promise<Relationship[]> {
    const colRef = collection(this.firestore, this.getCollectionPath("relationships"));
    const snap = await getDocs(colRef);
    return snap.docs.map(d => d.data() as Relationship);
  }

  async createRelationship(input: RelationshipInput): Promise<Relationship> {
    const graph = await this.getGraph();
    const cycleCheck = GraphCycleDetector.canAddRelationship(graph, input);
    if (!cycleCheck.isValid) {
      throw new Error(cycleCheck.error || "Quan hệ không hợp lệ hoặc tạo chu trình");
    }

    const id = input.id || `rel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newRel: Relationship = {
      ...input,
      id,
      createdAt: input.createdAt || now,
      updatedAt: now,
      createdBy: input.createdBy || "admin",
    };

    const ref = doc(this.firestore, this.getCollectionPath("relationships"), id);
    await setDoc(ref, cleanForFirestore(newRel));

    await this.recordAuditLog({
      action: "CREATE_RELATIONSHIP",
      entityType: "relationship",
      entityId: id,
      description: `Tạo mối quan hệ ${newRel.type} (${newRel.fromPersonId} -> ${newRel.toPersonId})`,
      performedBy: newRel.createdBy,
      newState: newRel,
    });

    return newRel;
  }

  async deleteRelationship(id: string): Promise<void> {
    const ref = doc(this.firestore, this.getCollectionPath("relationships"), id);
    await deleteDoc(ref);
  }

  // --- BRANCHES ---
  async getBranch(id: string): Promise<Branch | null> {
    const ref = doc(this.firestore, this.getCollectionPath("branches"), id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as Branch;
  }

  async getAllBranches(): Promise<Branch[]> {
    const colRef = collection(this.firestore, this.getCollectionPath("branches"));
    const snap = await getDocs(colRef);
    return snap.docs.map(d => d.data() as Branch);
  }

  async createBranch(input: BranchInput): Promise<Branch> {
    const id = input.id || `branch-${Date.now()}`;
    const now = new Date().toISOString();
    const branch: Branch = { ...input, id, createdAt: input.createdAt || now, updatedAt: now };
    const ref = doc(this.firestore, this.getCollectionPath("branches"), id);
    await setDoc(ref, cleanForFirestore(branch));
    return branch;
  }

  async updateBranch(id: string, updates: Partial<BranchInput>): Promise<Branch> {
    const existing = await this.getBranch(id);
    if (!existing) throw new Error("Không tìm thấy nhánh");
    const updated: Branch = { ...existing, ...updates, id, updatedAt: new Date().toISOString() };
    const ref = doc(this.firestore, this.getCollectionPath("branches"), id);
    await updateDoc(ref, cleanForFirestore(updated));
    return updated;
  }

  async deleteBranch(id: string): Promise<void> {
    const ref = doc(this.firestore, this.getCollectionPath("branches"), id);
    await deleteDoc(ref);
  }

  // --- NAMING & OVERRIDES ---
  async getNamingPreferences(): Promise<NamingPreferences> {
    const ref = doc(this.firestore, this.getCollectionPath("settings"), "namingPreferences");
    const snap = await getDoc(ref);
    if (!snap.exists()) return defaultSouthernNamingPreferences;
    return snap.data() as NamingPreferences;
  }

  async updateNamingPreferences(updates: Partial<NamingPreferences>): Promise<NamingPreferences> {
    const current = await this.getNamingPreferences();
    const updated = { ...current, ...updates };
    const ref = doc(this.firestore, this.getCollectionPath("settings"), "namingPreferences");
    await setDoc(ref, cleanForFirestore(updated));
    return updated;
  }

  async getAllOverrides(): Promise<KinshipOverride[]> {
    const colRef = collection(this.firestore, this.getCollectionPath("kinshipOverrides"));
    const snap = await getDocs(colRef);
    return snap.docs.map(d => d.data() as KinshipOverride);
  }

  async createOverride(input: KinshipOverrideInput): Promise<KinshipOverride> {
    const id = input.id || `override-${Date.now()}`;
    const now = new Date().toISOString();
    const override: KinshipOverride = {
      ...input,
      id,
      createdAt: input.createdAt || now,
      updatedAt: now,
      createdBy: input.createdBy || "admin",
    };
    const ref = doc(this.firestore, this.getCollectionPath("kinshipOverrides"), id);
    await setDoc(ref, cleanForFirestore(override));
    return override;
  }

  async updateOverride(id: string, updates: Partial<KinshipOverrideInput>): Promise<KinshipOverride> {
    const ref = doc(this.firestore, this.getCollectionPath("kinshipOverrides"), id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Ghi đè không tồn tại");
    const updated = { ...snap.data(), ...updates, id, updatedAt: new Date().toISOString() };
    await updateDoc(ref, cleanForFirestore(updated));
    return updated as KinshipOverride;
  }

  async deleteOverride(id: string): Promise<void> {
    const ref = doc(this.firestore, this.getCollectionPath("kinshipOverrides"), id);
    await deleteDoc(ref);
  }

  // --- GRAPH ---
  async getGraph(): Promise<FamilyGraph> {
    const [persons, rels] = await Promise.all([
      this.getAllPersons(),
      this.getAllRelationships(),
    ]);
    return new FamilyGraph(persons, rels);
  }

  // --- DUPLICATE & MERGE ---
  async detectDuplicates(): Promise<DuplicateCandidate[]> {
    const persons = await this.getAllPersons();
    const candidates: DuplicateCandidate[] = [];
    const normalize = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    for (let i = 0; i < persons.length; i++) {
      for (let j = i + 1; j < persons.length; j++) {
        const a = persons[i];
        const b = persons[j];
        let score = 0;
        const reasons: string[] = [];

        const normA = normalize(a.fullName);
        const normB = normalize(b.fullName);
        if (normA === normB) {
          score += 45;
          reasons.push("Họ tên trùng khớp hoàn toàn");
        } else if (normA.includes(normB) || normB.includes(normA)) {
          score += 25;
          reasons.push("Họ tên tương tự nhau");
        }

        if (a.gender === b.gender && a.gender !== "unknown") score += 10;
        if (a.birthDate?.year && b.birthDate?.year && a.birthDate.year === b.birthDate.year) {
          score += 25;
          reasons.push(`Cùng năm sinh (${a.birthDate.year})`);
        }

        if (score >= 40) {
          candidates.push({ personA: a, personB: b, matchScore: Math.min(score, 100), reasons });
        }
      }
    }
    return candidates.sort((x, y) => y.matchScore - x.matchScore);
  }

  async mergePersons(survivingId: string, mergedId: string): Promise<MergeResult> {
    const surviving = await this.getPerson(survivingId);
    const merged = await this.getPerson(mergedId);
    if (!surviving || !merged) throw new Error("Hồ sơ không tồn tại để sáp nhập");

    const batch = writeBatch(this.firestore);

    // Update surviving
    const updatedSurviving: Person = {
      ...surviving,
      preferredName: surviving.preferredName || merged.preferredName,
      birthDate: surviving.birthDate || merged.birthDate,
      hometown: surviving.hometown || merged.hometown,
      biography: surviving.biography || merged.biography,
      branchIds: Array.from(new Set([...surviving.branchIds, ...merged.branchIds])),
      notes: [surviving.notes, merged.notes, `[Đã sáp nhập từ ${mergedId}]`].filter(Boolean).join("\n"),
      updatedAt: new Date().toISOString(),
    };
    batch.set(
      doc(this.firestore, this.getCollectionPath("persons"), survivingId),
      cleanForFirestore(updatedSurviving)
    );

    // Delete merged person
    batch.delete(doc(this.firestore, this.getCollectionPath("persons"), mergedId));

    // Update relationships
    const rels = await this.getAllRelationships();
    let transferred = 0;
    for (const r of rels) {
      if (r.fromPersonId === mergedId || r.toPersonId === mergedId) {
        const newFrom = r.fromPersonId === mergedId ? survivingId : r.fromPersonId;
        const newTo = r.toPersonId === mergedId ? survivingId : r.toPersonId;
        if (newFrom === newTo) {
          batch.delete(doc(this.firestore, this.getCollectionPath("relationships"), r.id));
        } else {
          batch.update(doc(this.firestore, this.getCollectionPath("relationships"), r.id), {
            fromPersonId: newFrom,
            toPersonId: newTo,
            updatedAt: new Date().toISOString(),
          });
          transferred++;
        }
      }
    }

    await batch.commit();

    const audit = await this.recordAuditLog({
      action: "MERGE_PERSONS",
      entityType: "person",
      entityId: survivingId,
      description: `Sáp nhập ${merged.fullName} vào ${surviving.fullName}`,
      performedBy: "admin",
      newState: updatedSurviving,
    });

    return {
      survivingPersonId: survivingId,
      mergedPersonId: mergedId,
      transferredRelationships: transferred,
      auditLogId: audit.id,
    };
  }

  // --- AUDIT LOGS ---
  async getAuditLogs(limitCount: number = 100): Promise<AuditLog[]> {
    const colRef = collection(this.firestore, this.getCollectionPath("auditLogs"));
    const q = query(colRef, orderBy("timestamp", "desc"), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as AuditLog);
  }

  async recordAuditLog(log: Omit<AuditLog, "id" | "timestamp">): Promise<AuditLog> {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const entry: AuditLog = { ...log, id, timestamp: new Date().toISOString() };
    const ref = doc(this.firestore, this.getCollectionPath("auditLogs"), id);
    await setDoc(ref, cleanForFirestore(entry));
    return entry;
  }

  // --- BACKUP & RESTORE ---
  async exportBackup(): Promise<BackupPayload> {
    const [persons, relationships, branches, namingPreferences, kinshipOverrides, auditLogs] = await Promise.all([
      this.getAllPersons(),
      this.getAllRelationships(),
      this.getAllBranches(),
      this.getNamingPreferences(),
      this.getAllOverrides(),
      this.getAuditLogs(100),
    ]);
    return {
      version: "1.0",
      timestamp: new Date().toISOString(),
      spaceId: this.spaceId,
      persons,
      relationships,
      branches,
      namingPreferences,
      kinshipOverrides,
      auditLogs,
    };
  }

  async importBackup(
    backup: BackupPayload,
    mode: "replace" | "merge" = "replace"
  ): Promise<{ success: boolean; importedCount: number }> {
    const batch = writeBatch(this.firestore);
    let count = 0;

    for (const p of backup.persons || []) {
      batch.set(doc(this.firestore, this.getCollectionPath("persons"), p.id), cleanForFirestore(p));
      count++;
    }
    for (const r of backup.relationships || []) {
      batch.set(doc(this.firestore, this.getCollectionPath("relationships"), r.id), cleanForFirestore(r));
    }
    for (const b of backup.branches || []) {
      batch.set(doc(this.firestore, this.getCollectionPath("branches"), b.id), cleanForFirestore(b));
    }
    for (const o of backup.kinshipOverrides || []) {
      batch.set(doc(this.firestore, this.getCollectionPath("kinshipOverrides"), o.id), cleanForFirestore(o));
    }
    if (backup.namingPreferences) {
      batch.set(
        doc(this.firestore, this.getCollectionPath("settings"), "namingPreferences"),
        cleanForFirestore(backup.namingPreferences)
      );
    }

    await batch.commit();
    return { success: true, importedCount: count };
  }

  async resetToSampleData(): Promise<void> {
    const batch = writeBatch(this.firestore);
    for (const b of initialBranches) {
      batch.set(doc(this.firestore, this.getCollectionPath("branches"), b.id), cleanForFirestore(b));
    }
    for (const p of initialPersons) {
      batch.set(doc(this.firestore, this.getCollectionPath("persons"), p.id), cleanForFirestore(p));
    }
    for (const r of initialRelationships) {
      batch.set(doc(this.firestore, this.getCollectionPath("relationships"), r.id), cleanForFirestore(r));
    }
    for (const o of initialOverrides) {
      batch.set(doc(this.firestore, this.getCollectionPath("kinshipOverrides"), o.id), cleanForFirestore(o));
    }
    batch.set(
      doc(this.firestore, this.getCollectionPath("settings"), "namingPreferences"),
      cleanForFirestore(defaultSouthernNamingPreferences)
    );
    await batch.commit();
  }
}
