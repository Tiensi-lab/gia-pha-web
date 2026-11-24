import { z } from "zod";

export interface NamingPreferences {
  fatherTerm: string;             // "Ba" | "Cha" | "Tía"
  motherTerm: string;             // "Má" | "Mẹ" | "U"
  paternalMaleElderTerm: string;  // "Bác" | "Bác Hai"
  paternalMaleYoungerTerm: string;// "Chú"
  paternalFemaleTerm: string;     // "Cô"
  maternalMaleTerm: string;       // "Cậu"
  maternalFemaleTerm: string;     // "Dì"
  paternalGrandfatherTerm: string;// "Ông nội"
  paternalGrandmotherTerm: string;// "Bà nội"
  maternalGrandfatherTerm: string;// "Ông ngoại"
  maternalGrandmotherTerm: string;// "Bà ngoại"
  prioritizeBranchSeniority: boolean; // default true in Vietnamese genealogy (xét theo vai vế cành/nhánh trước tuổi tác)
  useOrdinalTitles: boolean;      // default true (Anh Hai, Chị Ba, Chú Út...)
  dialect: "southern_vietnamese";
}

export const defaultSouthernNamingPreferences: NamingPreferences = {
  fatherTerm: "Ba",
  motherTerm: "Má",
  paternalMaleElderTerm: "Bác",
  paternalMaleYoungerTerm: "Chú",
  paternalFemaleTerm: "Cô",
  maternalMaleTerm: "Cậu",
  maternalFemaleTerm: "Dì",
  paternalGrandfatherTerm: "Ông nội",
  paternalGrandmotherTerm: "Bà nội",
  maternalGrandfatherTerm: "Ông ngoại",
  maternalGrandmotherTerm: "Bà ngoại",
  prioritizeBranchSeniority: true,
  useOrdinalTitles: true,
  dialect: "southern_vietnamese",
};

export const NamingPreferencesSchema = z.object({
  fatherTerm: z.string().min(1),
  motherTerm: z.string().min(1),
  paternalMaleElderTerm: z.string().min(1),
  paternalMaleYoungerTerm: z.string().min(1),
  paternalFemaleTerm: z.string().min(1),
  maternalMaleTerm: z.string().min(1),
  maternalFemaleTerm: z.string().min(1),
  paternalGrandfatherTerm: z.string().min(1),
  paternalGrandmotherTerm: z.string().min(1),
  maternalGrandfatherTerm: z.string().min(1),
  maternalGrandmotherTerm: z.string().min(1),
  prioritizeBranchSeniority: z.boolean(),
  useOrdinalTitles: z.boolean(),
  dialect: z.literal("southern_vietnamese"),
});

export interface KinshipOverride {
  id: string;
  speakerId: string;
  targetId: string;
  addressTerm: string;          // e.g. "Dì Hai", "Thím Ba", "Bác Tám"
  selfReferenceTerm?: string;   // e.g. "Con", "Cháu", "Em"
  notes?: string;
  branchId?: string;           // Optional: level 2 branch-specific override
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const KinshipOverrideSchema = z.object({
  id: z.string().min(1),
  speakerId: z.string().min(1, "Người xưng hô không được để trống"),
  targetId: z.string().min(1, "Người được gọi không được để trống"),
  addressTerm: z.string().min(1, "Từ xưng hô không được để trống"),
  selfReferenceTerm: z.string().optional(),
  notes: z.string().optional(),
  branchId: z.string().optional(),
  createdBy: z.string().default("admin"),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
}).refine(data => data.speakerId !== data.targetId, {
  message: "Không thể ghi đè cách xưng hô với chính mình",
  path: ["targetId"],
});

export type KinshipOverrideInput = z.infer<typeof KinshipOverrideSchema>;
