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

const STORAGE_KEYS = {
  PERSONS: "gia_pha_persons",
  RELATIONSHIPS: "gia_pha_relationships",
  BRANCHES: "gia_pha_branches",
  NAMING: "gia_pha_naming",
  OVERRIDES: "gia_pha_overrides",
  AUDIT: "gia_pha_audit",
};

export class InMemoryRepository implements FamilyRepository {
  private persons: Map<string, Person> = new Map();
  private relationships: Map<string, Relationship> = new Map();
  private branches: Map<string, Branch> = new Map();
  private namingPreferences: NamingPreferences = { ...defaultSouthernNamingPreferences };
  private overrides: Map<string, KinshipOverride> = new Map();
  private auditLogs: AuditLog[] = [];
  private isBrowser: boolean = typeof window !== "undefined";

  constructor() {
    this.loadFromStorageOrSeed();
  }

  private loadFromStorageOrSeed(): void {
    if (this.isBrowser) {
      try {
        const storedPersons = localStorage.getItem(STORAGE_KEYS.PERSONS);
        const storedRels = localStorage.getItem(STORAGE_KEYS.RELATIONSHIPS);
        const storedBranches = localStorage.getItem(STORAGE_KEYS.BRANCHES);
        const storedNaming = localStorage.getItem(STORAGE_KEYS.NAMING);
        const storedOverrides = localStorage.getItem(STORAGE_KEYS.OVERRIDES);
        const storedAudit = localStorage.getItem(STORAGE_KEYS.AUDIT);

        if (storedPersons && storedRels) {
          const pList: Person[] = JSON.parse(storedPersons);
          const rList: Relationship[] = JSON.parse(storedRels);
          const bList: Branch[] = storedBranches ? JSON.parse(storedBranches) : initialBranches;
          const oList: KinshipOverride[] = storedOverrides ? JSON.parse(storedOverrides) : initialOverrides;
          const aList: AuditLog[] = storedAudit ? JSON.parse(storedAudit) : [];

          for (const p of pList) this.persons.set(p.id, p);
          for (const r of rList) this.relationships.set(r.id, r);
          for (const b of bList) this.branches.set(b.id, b);
          for (const o of oList) this.overrides.set(o.id, o);
          this.auditLogs = aList;
          if (storedNaming) this.namingPreferences = JSON.parse(storedNaming);
          return;
        }
      } catch (e) {
        console.warn("Could not load from localStorage, falling back to seed data", e);
      }
    }

    // Initialize with seed
    for (const p of initialPersons) this.persons.set(p.id, p);
    for (const r of initialRelationships) this.relationships.set(r.id, r);
    for (const b of initialBranches) this.branches.set(b.id, b);
    for (const o of initialOverrides) this.overrides.set(o.id, o);
    this.namingPreferences = { ...defaultSouthernNamingPreferences };
    this.recordAuditLog({
      action: "IMPORT_DATA",
      entityType: "system",
      entityId: "initial-seed",
      description: "Khởi tạo dữ liệu mẫu gia phả ban đầu",
      performedBy: "system",
    });
  }

  private persist(): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(STORAGE_KEYS.PERSONS, JSON.stringify(Array.from(this.persons.values())));
      localStorage.setItem(STORAGE_KEYS.RELATIONSHIPS, JSON.stringify(Array.from(this.relationships.values())));
      localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(Array.from(this.branches.values())));
      localStorage.setItem(STORAGE_KEYS.NAMING, JSON.stringify(this.namingPreferences));
      localStorage.setItem(STORAGE_KEYS.OVERRIDES, JSON.stringify(Array.from(this.overrides.values())));
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(this.auditLogs));
    } catch (e) {
      console.error("Failed to persist data to localStorage", e);
    }
  }

  // --- PERSONS ---
  async getPerson(id: string): Promise<Person | null> {
    return this.persons.get(id) || null;
  }

  async getAllPersons(includeArchived: boolean = false): Promise<Person[]> {
    const all = Array.from(this.persons.values());
    if (includeArchived) return all;
    // Filter out archived if any
    return all.filter(p => !p.notes?.includes("[ARCHIVED]"));
  }

  async createPerson(input: PersonInput): Promise<Person> {
    const now = new Date().toISOString();
    const newPerson: Person = {
      ...input,
      id: input.id || `person-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      gender: input.gender || "unknown",
      livingStatus: input.livingStatus || "living",
      createdAt: input.createdAt || now,
      updatedAt: now,
      createdBy: input.createdBy || "admin",
      branchIds: input.branchIds || ["branch-root"],
      visibility: input.visibility || { isPublic: true },
    };

    this.persons.set(newPerson.id, newPerson);
    this.persist();

    await this.recordAuditLog({
      action: "CREATE_PERSON",
      entityType: "person",
      entityId: newPerson.id,
      description: `Thêm thành viên mới: ${newPerson.fullName}`,
      performedBy: newPerson.createdBy,
      newState: newPerson,
    });

    return newPerson;
  }

  async updatePerson(id: string, updates: Partial<PersonInput>): Promise<Person> {
    const existing = this.persons.get(id);
    if (!existing) throw new Error(`Không tìm thấy thành viên có ID: ${id}`);

    const updated: Person = {
      ...existing,
      ...updates,
      id, // Preserve id
      updatedAt: new Date().toISOString(),
    };

    this.persons.set(id, updated);
    this.persist();

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
    const existing = this.persons.get(id);
    if (!existing) return;

    this.persons.delete(id);

    // Remove relationships referencing this person to prevent dangling references
    for (const [relId, r] of this.relationships) {
      if (r.fromPersonId === id || r.toPersonId === id) {
        this.relationships.delete(relId);
      }
    }

    // Remove overrides referencing this person
    for (const [ovId, o] of this.overrides) {
      if (o.speakerId === id || o.targetId === id) {
        this.overrides.delete(ovId);
      }
    }

    this.persist();

    await this.recordAuditLog({
      action: "DELETE_PERSON",
      entityType: "person",
      entityId: id,
      description: `Xóa thành viên: ${existing.fullName} cùng các mối quan hệ liên đới`,
      performedBy: "admin",
      previousState: existing,
    });
  }

  async archivePerson(id: string): Promise<void> {
    const p = this.persons.get(id);
    if (!p) return;
    p.notes = (p.notes || "") + " [ARCHIVED]";
    p.updatedAt = new Date().toISOString();
    this.persons.set(id, p);
    this.persist();

    await this.recordAuditLog({
      action: "ARCHIVE_PERSON",
      entityType: "person",
      entityId: id,
      description: `Lưu trữ (ẩn) thành viên: ${p.fullName}`,
      performedBy: "admin",
    });
  }

  async restorePerson(id: string): Promise<void> {
    const p = this.persons.get(id);
    if (!p) return;
    p.notes = (p.notes || "").replace("[ARCHIVED]", "").trim();
    p.updatedAt = new Date().toISOString();
    this.persons.set(id, p);
    this.persist();

    await this.recordAuditLog({
      action: "RESTORE_PERSON",
      entityType: "person",
      entityId: id,
      description: `Phục hồi thành viên: ${p.fullName}`,
      performedBy: "admin",
    });
  }

  // --- RELATIONSHIPS ---
  async getRelationship(id: string): Promise<Relationship | null> {
    return this.relationships.get(id) || null;
  }

  async getAllRelationships(): Promise<Relationship[]> {
    return Array.from(this.relationships.values());
  }

  async createRelationship(input: RelationshipInput): Promise<Relationship> {
    const graph = await this.getGraph();
    const cycleCheck = GraphCycleDetector.canAddRelationship(graph, input);
    if (!cycleCheck.isValid) {
      throw new Error(cycleCheck.error || "Quan hệ không hợp lệ hoặc tạo chu trình");
    }

    const now = new Date().toISOString();
    const newRel: Relationship = {
      ...input,
      id: input.id || `rel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: input.createdAt || now,
      updatedAt: now,
      createdBy: input.createdBy || "admin",
    };

    this.relationships.set(newRel.id, newRel);
    this.persist();

    const fromP = this.persons.get(newRel.fromPersonId);
    const toP = this.persons.get(newRel.toPersonId);

    await this.recordAuditLog({
      action: "CREATE_RELATIONSHIP",
      entityType: "relationship",
      entityId: newRel.id,
      description: `Tạo quan hệ ${newRel.type} giữa ${fromP?.fullName || newRel.fromPersonId} và ${toP?.fullName || newRel.toPersonId}`,
      performedBy: newRel.createdBy,
      newState: newRel,
    });

    return newRel;
  }

  async deleteRelationship(id: string): Promise<void> {
    const existing = this.relationships.get(id);
    if (!existing) return;

    this.relationships.delete(id);
    this.persist();

    await this.recordAuditLog({
      action: "DELETE_RELATIONSHIP",
      entityType: "relationship",
      entityId: id,
      description: `Xóa mối quan hệ ${existing.type} (${existing.fromPersonId} -> ${existing.toPersonId})`,
      performedBy: "admin",
      previousState: existing,
    });
  }

  // --- BRANCHES ---
  async getBranch(id: string): Promise<Branch | null> {
    return this.branches.get(id) || null;
  }

  async getAllBranches(): Promise<Branch[]> {
    return Array.from(this.branches.values());
  }

  async createBranch(input: BranchInput): Promise<Branch> {
    const now = new Date().toISOString();
    const newBranch: Branch = {
      ...input,
      id: input.id || `branch-${Date.now()}`,
      createdAt: input.createdAt || now,
      updatedAt: now,
    };
    this.branches.set(newBranch.id, newBranch);
    this.persist();
    return newBranch;
  }

  async updateBranch(id: string, updates: Partial<BranchInput>): Promise<Branch> {
    const existing = this.branches.get(id);
    if (!existing) throw new Error(`Không tìm thấy nhánh: ${id}`);
    const updated: Branch = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.branches.set(id, updated);
    this.persist();
    return updated;
  }

  async deleteBranch(id: string): Promise<void> {
    this.branches.delete(id);
    this.persist();
  }

  // --- NAMING & OVERRIDES ---
  async getNamingPreferences(): Promise<NamingPreferences> {
    return { ...this.namingPreferences };
  }

  async updateNamingPreferences(updates: Partial<NamingPreferences>): Promise<NamingPreferences> {
    this.namingPreferences = {
      ...this.namingPreferences,
      ...updates,
    };
    this.persist();

    await this.recordAuditLog({
      action: "UPDATE_NAMING_RULES",
      entityType: "namingRules",
      entityId: "global",
      description: "Cập nhật quy tắc xưng hô gia phả miền Nam",
      performedBy: "admin",
      newState: this.namingPreferences,
    });

    return { ...this.namingPreferences };
  }

  async getAllOverrides(): Promise<KinshipOverride[]> {
    return Array.from(this.overrides.values());
  }

  async createOverride(input: KinshipOverrideInput): Promise<KinshipOverride> {
    const now = new Date().toISOString();
    const newOverride: KinshipOverride = {
      ...input,
      id: input.id || `override-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: input.createdAt || now,
      updatedAt: now,
      createdBy: input.createdBy || "admin",
    };
    this.overrides.set(newOverride.id, newOverride);
    this.persist();

    await this.recordAuditLog({
      action: "CREATE_OVERRIDE",
      entityType: "override",
      entityId: newOverride.id,
      description: `Ghi đè cách gọi tùy chỉnh: ${newOverride.speakerId} gọi ${newOverride.targetId} là "${newOverride.addressTerm}"`,
      performedBy: newOverride.createdBy,
      newState: newOverride,
    });

    return newOverride;
  }

  async updateOverride(id: string, updates: Partial<KinshipOverrideInput>): Promise<KinshipOverride> {
    const existing = this.overrides.get(id);
    if (!existing) throw new Error(`Không tìm thấy ghi đè ID: ${id}`);
    const updated: KinshipOverride = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.overrides.set(id, updated);
    this.persist();
    return updated;
  }

  async deleteOverride(id: string): Promise<void> {
    const existing = this.overrides.get(id);
    if (!existing) return;
    this.overrides.delete(id);
    this.persist();

    await this.recordAuditLog({
      action: "DELETE_OVERRIDE",
      entityType: "override",
      entityId: id,
      description: `Xóa ghi đè cách gọi xưng hô ID: ${id}`,
      performedBy: "admin",
      previousState: existing,
    });
  }

  // --- GRAPH ---
  async getGraph(): Promise<FamilyGraph> {
    return new FamilyGraph(
      Array.from(this.persons.values()),
      Array.from(this.relationships.values())
    );
  }

  // --- DUPLICATE DETECTION & MERGE ---
  async detectDuplicates(): Promise<DuplicateCandidate[]> {
    const persons = Array.from(this.persons.values());
    const candidates: DuplicateCandidate[] = [];

    const normalize = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    for (let i = 0; i < persons.length; i++) {
      for (let j = i + 1; j < persons.length; j++) {
        const a = persons[i];
        const b = persons[j];
        let score = 0;
        const reasons: string[] = [];

        // Name match
        const normA = normalize(a.fullName);
        const normB = normalize(b.fullName);
        if (normA === normB) {
          score += 45;
          reasons.push("Họ tên trùng khớp hoàn toàn");
        } else if (normA.includes(normB) || normB.includes(normA)) {
          score += 25;
          reasons.push("Họ tên tương tự nhau");
        }

        // Gender match
        if (a.gender === b.gender && a.gender !== "unknown") {
          score += 10;
        }

        // Birth year match
        if (a.birthDate?.year && b.birthDate?.year) {
          if (a.birthDate.year === b.birthDate.year) {
            score += 25;
            reasons.push(`Cùng năm sinh (${a.birthDate.year})`);
          } else if (Math.abs(a.birthDate.year - b.birthDate.year) <= 1) {
            score += 15;
            reasons.push(`Năm sinh sát nhau (${a.birthDate.year} vs ${b.birthDate.year})`);
          }
        }

        // Hometown or Birthplace match
        if (a.hometown && b.hometown && normalize(a.hometown) === normalize(b.hometown)) {
          score += 10;
          reasons.push("Cùng quê quán");
        }

        if (score >= 40) {
          candidates.push({
            personA: a,
            personB: b,
            matchScore: Math.min(score, 100),
            reasons,
          });
        }
      }
    }

    candidates.sort((x, y) => y.matchScore - x.matchScore);
    return candidates;
  }

  async mergePersons(survivingId: string, mergedId: string): Promise<MergeResult> {
    const surviving = this.persons.get(survivingId);
    const merged = this.persons.get(mergedId);

    if (!surviving || !merged) {
      throw new Error("Không tìm thấy một trong hai hồ sơ để sáp nhập");
    }
    if (survivingId === mergedId) {
      throw new Error("Không thể sáp nhập một hồ sơ với chính nó");
    }

    // Transfer profile info where surviving is empty
    const updatedSurviving: Person = {
      ...surviving,
      preferredName: surviving.preferredName || merged.preferredName,
      birthName: surviving.birthName || merged.birthName,
      birthDate: surviving.birthDate || merged.birthDate,
      deathDate: surviving.deathDate || merged.deathDate,
      birthPlace: surviving.birthPlace || merged.birthPlace,
      hometown: surviving.hometown || merged.hometown,
      biography: surviving.biography || merged.biography,
      photoPath: surviving.photoPath || merged.photoPath,
      notes: [surviving.notes, merged.notes, `[Đã sáp nhập từ hồ sơ ID: ${mergedId} (${merged.fullName})]`]
        .filter(Boolean)
        .join("\n"),
      branchIds: Array.from(new Set([...surviving.branchIds, ...merged.branchIds])),
      updatedAt: new Date().toISOString(),
    };
    this.persons.set(survivingId, updatedSurviving);

    // Transfer relationships
    let transferred = 0;
    const existingRels = Array.from(this.relationships.values());

    for (const rel of existingRels) {
      let changed = false;
      let newFrom = rel.fromPersonId;
      let newTo = rel.toPersonId;

      if (rel.fromPersonId === mergedId) {
        newFrom = survivingId;
        changed = true;
      }
      if (rel.toPersonId === mergedId) {
        newTo = survivingId;
        changed = true;
      }

      if (changed) {
        // Prevent self relationship
        if (newFrom === newTo) {
          this.relationships.delete(rel.id);
          continue;
        }

        // Check if relationship already exists
        const duplicate = existingRels.find(
          r => r.id !== rel.id && r.type === rel.type && r.fromPersonId === newFrom && r.toPersonId === newTo
        );

        if (duplicate) {
          this.relationships.delete(rel.id);
        } else {
          this.relationships.set(rel.id, {
            ...rel,
            fromPersonId: newFrom,
            toPersonId: newTo,
            updatedAt: new Date().toISOString(),
          });
          transferred++;
        }
      }
    }

    // Transfer overrides
    for (const [ovId, ov] of this.overrides) {
      let changed = false;
      let spk = ov.speakerId;
      let tgt = ov.targetId;
      if (ov.speakerId === mergedId) { spk = survivingId; changed = true; }
      if (ov.targetId === mergedId) { tgt = survivingId; changed = true; }
      if (changed) {
        if (spk === tgt) {
          this.overrides.delete(ovId);
        } else {
          this.overrides.set(ovId, { ...ov, speakerId: spk, targetId: tgt });
        }
      }
    }

    // Delete the merged person record
    this.persons.delete(mergedId);
    this.persist();

    const audit = await this.recordAuditLog({
      action: "MERGE_PERSONS",
      entityType: "person",
      entityId: survivingId,
      description: `Sáp nhập hồ sơ: ${merged.fullName} (${mergedId}) vào ${surviving.fullName} (${survivingId}). Chuyển ${transferred} mối quan hệ.`,
      performedBy: "admin",
      previousState: { surviving, merged },
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
    return this.auditLogs.slice(-limitCount).reverse();
  }

  async recordAuditLog(log: Omit<AuditLog, "id" | "timestamp">): Promise<AuditLog> {
    const entry: AuditLog = {
      ...log,
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.push(entry);
    if (this.auditLogs.length > 500) {
      this.auditLogs = this.auditLogs.slice(-500);
    }
    this.persist();
    return entry;
  }

  // --- BACKUP & RESTORE ---
  async exportBackup(): Promise<BackupPayload> {
    return {
      version: "1.0",
      timestamp: new Date().toISOString(),
      spaceId: "default-space",
      persons: Array.from(this.persons.values()),
      relationships: Array.from(this.relationships.values()),
      branches: Array.from(this.branches.values()),
      namingPreferences: { ...this.namingPreferences },
      kinshipOverrides: Array.from(this.overrides.values()),
      auditLogs: [...this.auditLogs],
    };
  }

  async importBackup(
    backup: BackupPayload,
    mode: "replace" | "merge" = "replace"
  ): Promise<{ success: boolean; importedCount: number }> {
    if (mode === "replace") {
      this.persons.clear();
      this.relationships.clear();
      this.branches.clear();
      this.overrides.clear();
    }

    let count = 0;
    for (const p of backup.persons || []) {
      this.persons.set(p.id, p);
      count++;
    }
    for (const r of backup.relationships || []) {
      this.relationships.set(r.id, r);
    }
    for (const b of backup.branches || []) {
      this.branches.set(b.id, b);
    }
    for (const o of backup.kinshipOverrides || []) {
      this.overrides.set(o.id, o);
    }
    if (backup.namingPreferences) {
      this.namingPreferences = { ...backup.namingPreferences };
    }

    this.persist();

    await this.recordAuditLog({
      action: "RESTORE_BACKUP",
      entityType: "system",
      entityId: "backup-import",
      description: `Khôi phục sao lưu dữ liệu (${mode}): nạp ${count} thành viên`,
      performedBy: "admin",
    });

    return { success: true, importedCount: count };
  }

  async resetToSampleData(): Promise<void> {
    this.persons.clear();
    this.relationships.clear();
    this.branches.clear();
    this.overrides.clear();
    this.auditLogs = [];

    for (const p of initialPersons) this.persons.set(p.id, p);
    for (const r of initialRelationships) this.relationships.set(r.id, r);
    for (const b of initialBranches) this.branches.set(b.id, b);
    for (const o of initialOverrides) this.overrides.set(o.id, o);
    this.namingPreferences = { ...defaultSouthernNamingPreferences };

    this.persist();

    await this.recordAuditLog({
      action: "IMPORT_DATA",
      entityType: "system",
      entityId: "sample-reset",
      description: "Khôi phục lại dữ liệu mẫu gốc ban đầu",
      performedBy: "admin",
    });
  }
}
