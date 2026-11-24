import { z } from "zod";

export type AuditAction = 
  | "CREATE_PERSON"
  | "UPDATE_PERSON"
  | "DELETE_PERSON"
  | "ARCHIVE_PERSON"
  | "RESTORE_PERSON"
  | "CREATE_RELATIONSHIP"
  | "DELETE_RELATIONSHIP"
  | "UPDATE_RELATIONSHIP"
  | "MERGE_PERSONS"
  | "UPDATE_NAMING_RULES"
  | "CREATE_OVERRIDE"
  | "UPDATE_OVERRIDE"
  | "DELETE_OVERRIDE"
  | "IMPORT_DATA"
  | "RESTORE_BACKUP";

export interface AuditLog {
  id: string;
  action: AuditAction;
  entityType: "person" | "relationship" | "branch" | "namingRules" | "override" | "system";
  entityId: string;
  description: string;
  performedBy: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  previousState?: unknown;
  newState?: unknown;
}

export const AuditLogSchema = z.object({
  id: z.string().min(1),
  action: z.string(),
  entityType: z.enum(["person", "relationship", "branch", "namingRules", "override", "system"]),
  entityId: z.string(),
  description: z.string(),
  performedBy: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  previousState: z.unknown().optional(),
  newState: z.unknown().optional(),
});
