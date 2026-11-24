import { Person, PersonInput } from "../../domain/models/person";
import { Relationship, RelationshipInput } from "../../domain/models/relationship";
import { Branch, BranchInput } from "../../domain/models/branch";
import { NamingPreferences, KinshipOverride, KinshipOverrideInput } from "../../domain/models/naming";
import { AuditLog } from "../../domain/models/audit";
import { FamilyGraph } from "../../domain/graph/familyGraph";

export interface DuplicateCandidate {
  personA: Person;
  personB: Person;
  matchScore: number; // 0 - 100
  reasons: string[];
}

export interface MergeResult {
  survivingPersonId: string;
  mergedPersonId: string;
  transferredRelationships: number;
  auditLogId: string;
}

export interface BackupPayload {
  version: string;
  timestamp: string;
  spaceId: string;
  persons: Person[];
  relationships: Relationship[];
  branches: Branch[];
  namingPreferences: NamingPreferences;
  kinshipOverrides: KinshipOverride[];
  auditLogs: AuditLog[];
}

export interface FamilyRepository {
  // Persons
  getPerson(id: string): Promise<Person | null>;
  getAllPersons(includeArchived?: boolean): Promise<Person[]>;
  createPerson(input: PersonInput): Promise<Person>;
  updatePerson(id: string, updates: Partial<PersonInput>): Promise<Person>;
  deletePerson(id: string): Promise<void>;
  archivePerson(id: string): Promise<void>;
  restorePerson(id: string): Promise<void>;

  // Relationships
  getRelationship(id: string): Promise<Relationship | null>;
  getAllRelationships(): Promise<Relationship[]>;
  createRelationship(input: RelationshipInput): Promise<Relationship>;
  deleteRelationship(id: string): Promise<void>;

  // Branches
  getBranch(id: string): Promise<Branch | null>;
  getAllBranches(): Promise<Branch[]>;
  createBranch(input: BranchInput): Promise<Branch>;
  updateBranch(id: string, updates: Partial<BranchInput>): Promise<Branch>;
  deleteBranch(id: string): Promise<void>;

  // Naming & Overrides
  getNamingPreferences(): Promise<NamingPreferences>;
  updateNamingPreferences(updates: Partial<NamingPreferences>): Promise<NamingPreferences>;
  getAllOverrides(): Promise<KinshipOverride[]>;
  createOverride(input: KinshipOverrideInput): Promise<KinshipOverride>;
  updateOverride(id: string, updates: Partial<KinshipOverrideInput>): Promise<KinshipOverride>;
  deleteOverride(id: string): Promise<void>;

  // Graph
  getGraph(): Promise<FamilyGraph>;

  // Duplicates & Merging
  detectDuplicates(): Promise<DuplicateCandidate[]>;
  mergePersons(survivingId: string, mergedId: string): Promise<MergeResult>;

  // Audit Logs
  getAuditLogs(limitCount?: number): Promise<AuditLog[]>;
  recordAuditLog(log: Omit<AuditLog, "id" | "timestamp">): Promise<AuditLog>;

  // Backup & Import / Export
  exportBackup(): Promise<BackupPayload>;
  importBackup(backup: BackupPayload, mode: "replace" | "merge"): Promise<{ success: boolean; importedCount: number }>;
  resetToSampleData(): Promise<void>;
}
