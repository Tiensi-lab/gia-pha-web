import { z } from "zod";

export type Gender = "male" | "female" | "other" | "unknown";
export type LivingStatus = "living" | "deceased" | "unknown";

export interface PartialGenealogicalDate {
  year?: number;
  month?: number; // 1 - 12
  day?: number;   // 1 - 31
  isApproximate?: boolean;
  isLunar?: boolean;
  lunarDetails?: {
    canChiYear?: string; // e.g. "Giáp Tý", "Ất Sửu"
    isLeapMonth?: boolean;
  };
  formattedRaw?: string;
}

export const PartialGenealogicalDateSchema = z.object({
  year: z.number().int().min(1000).max(3000).optional(),
  month: z.number().int().min(1).max(12).optional(),
  day: z.number().int().min(1).max(31).optional(),
  isApproximate: z.boolean().optional(),
  isLunar: z.boolean().optional(),
  lunarDetails: z.object({
    canChiYear: z.string().optional(),
    isLeapMonth: z.boolean().optional(),
  }).optional(),
  formattedRaw: z.string().optional(),
}).optional();

export interface PersonVisibility {
  isPublic: boolean;
  hideLivingDetails?: boolean;
  hideNotes?: boolean;
  hidePhoto?: boolean;
}

export const PersonVisibilitySchema = z.object({
  isPublic: z.boolean().default(false),
  hideLivingDetails: z.boolean().default(true),
  hideNotes: z.boolean().default(true),
  hidePhoto: z.boolean().default(false),
});

export interface Person {
  id: string;
  fullName: string;
  preferredName?: string;
  birthName?: string;
  gender: Gender;

  birthDate?: PartialGenealogicalDate;
  deathDate?: PartialGenealogicalDate;

  livingStatus: LivingStatus;

  birthPlace?: string;
  hometown?: string;
  biography?: string;
  notes?: string;

  photoPath?: string;

  siblingOrder?: number;
  familyOrdinalName?: string; // "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy", "Tám", "Chín", "Mười", "Út"

  branchIds: string[];

  visibility: PersonVisibility;

  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export const PersonSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1, "Họ và tên không được để trống"),
  preferredName: z.string().optional(),
  birthName: z.string().optional(),
  gender: z.enum(["male", "female", "other", "unknown"]).default("unknown"),
  birthDate: PartialGenealogicalDateSchema,
  deathDate: PartialGenealogicalDateSchema,
  livingStatus: z.enum(["living", "deceased", "unknown"]).default("living"),
  birthPlace: z.string().optional(),
  hometown: z.string().optional(),
  biography: z.string().optional(),
  notes: z.string().optional(),
  photoPath: z.string().optional(),
  siblingOrder: z.number().int().min(1).max(50).optional(),
  familyOrdinalName: z.string().optional(),
  branchIds: z.array(z.string()).default([]),
  visibility: PersonVisibilitySchema.default({
    isPublic: false,
    hideLivingDetails: true,
    hideNotes: true,
    hidePhoto: false,
  }),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  createdBy: z.string().default("admin"),
});

export type PersonInput = Partial<Omit<Person, "id" | "fullName">> & {
  id?: string;
  fullName: string;
};
export type PersonOutput = z.infer<typeof PersonSchema>;
