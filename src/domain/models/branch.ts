import { z } from "zod";

export interface Branch {
  id: string;
  name: string;
  description?: string;
  rootPersonId?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export const BranchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Tên nhánh không được để trống"),
  description: z.string().optional(),
  rootPersonId: z.string().optional(),
  color: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type BranchInput = z.infer<typeof BranchSchema>;
