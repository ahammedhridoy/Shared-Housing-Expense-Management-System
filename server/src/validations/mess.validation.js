import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "Invalid ID format");

export const createMessSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Mess name is required")
    .max(100, "Mess name must be at most 100 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .nullable(),
  address: z
    .string()
    .trim()
    .max(200, "Address must be at most 200 characters")
    .optional()
    .nullable(),
});

export const updateMessSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Mess name cannot be empty")
      .max(100, "Mess name must be at most 100 characters")
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, "Description must be at most 500 characters")
      .optional()
      .nullable(),
    address: z
      .string()
      .trim()
      .max(200, "Address must be at most 200 characters")
      .optional()
      .nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const messIdParamSchema = z.object({
  messId: objectId,
});

export const messMemberParamSchema = z.object({
  messId: objectId,
  userId: objectId,
});
