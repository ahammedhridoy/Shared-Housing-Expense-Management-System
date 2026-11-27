import { z } from "zod";
import { objectId } from "./common.js";

export { messIdParamSchema } from "./common.js";

export const createMessSchema = z.object({
  name: z.string().trim().min(1, "Mess name is required").max(100, "Mess name must be at most 100 characters"),
  description: z.string().trim().max(500, "Description must be at most 500 characters").optional().nullable(),
  address: z.string().trim().max(200, "Address must be at most 200 characters").optional().nullable(),
  // Room rent for the creator (manager)
  rentAmount: z.number().min(0, "Rent cannot be negative").max(10000000).optional(),
});

export const updateMessSchema = z
  .object({
    name: z.string().trim().min(1, "Mess name cannot be empty").max(100).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    address: z.string().trim().max(200).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const messMemberParamSchema = z.object({
  messId: objectId,
  userId: objectId,
});

export const updateMemberSchema = z
  .object({
    rentAmount: z.number().min(0, "Rent cannot be negative").max(10000000).optional(),
    role: z.enum(["MANAGER", "MEMBER"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });
