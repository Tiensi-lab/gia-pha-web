import { z } from "zod";
import { PartialGenealogicalDate, PartialGenealogicalDateSchema } from "./person";

export type RelationshipType = "PARENT_CHILD" | "PARTNERSHIP" | "PROVISIONAL_SIBLING";

export type ParentChildNature = "biological" | "adoptive" | "step" | "foster" | "unknown";

export interface ParentChildData {
  nature: ParentChildNature;
  confidence?: "certain" | "probable" | "uncertain";
}

export interface PartnershipData {
  isCurrent?: boolean;
  startDate?: PartialGenealogicalDate;
  endDate?: PartialGenealogicalDate;
  marriageType?: "registered" | "traditional" | "cohabitation" | "unknown";
  notes?: string;
}

export interface ProvisionalSiblingData {
  reason: string;
  confidence?: "certain" | "probable" | "uncertain";
}

export interface Relationship {
  id: string;
  type: RelationshipType;
  fromPersonId: string;
  toPersonId: string;
  parentChildData?: ParentChildData;
  partnershipData?: PartnershipData;
  provisionalSiblingData?: ProvisionalSiblingData;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export const ParentChildDataSchema = z.object({
  nature: z.enum(["biological", "adoptive", "step", "foster", "unknown"]).default("biological"),
  confidence: z.enum(["certain", "probable", "uncertain"]).default("certain"),
});

export const PartnershipDataSchema = z.object({
  isCurrent: z.boolean().default(true),
  startDate: PartialGenealogicalDateSchema,
  endDate: PartialGenealogicalDateSchema,
  marriageType: z.enum(["registered", "traditional", "cohabitation", "unknown"]).default("traditional"),
  notes: z.string().optional(),
});

export const ProvisionalSiblingDataSchema = z.object({
  reason: z.string().min(1, "Lý do quan hệ anh chị em tạm thời"),
  confidence: z.enum(["certain", "probable", "uncertain"]).default("probable"),
});

export const RelationshipSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["PARENT_CHILD", "PARTNERSHIP", "PROVISIONAL_SIBLING"]),
  fromPersonId: z.string().min(1, "Người nguồn không được để trống"),
  toPersonId: z.string().min(1, "Người đích không được để trống"),
  parentChildData: ParentChildDataSchema.optional(),
  partnershipData: PartnershipDataSchema.optional(),
  provisionalSiblingData: ProvisionalSiblingDataSchema.optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  createdBy: z.string().default("admin"),
}).refine(data => data.fromPersonId !== data.toPersonId, {
  message: "Một người không thể có quan hệ với chính bản thân mình",
  path: ["toPersonId"],
});

export type RelationshipInput = Partial<Omit<Relationship, "id" | "type" | "fromPersonId" | "toPersonId">> & {
  id?: string;
  type: RelationshipType;
  fromPersonId: string;
  toPersonId: string;
};
export type RelationshipOutput = z.infer<typeof RelationshipSchema>;
