import { z } from "zod";

export const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "Invalid ID format");

export const day = z
  .string({ error: "Date is required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const money = z
  .number({ error: "Amount must be a number" })
  .positive("Amount must be greater than 0")
  .max(99999999, "Amount is too large");

export const monthNum = z.coerce.number().int().min(1, "Month must be 1-12").max(12, "Month must be 1-12");
export const yearNum = z.coerce.number().int().min(2000, "Invalid year").max(2100, "Invalid year");

export const monthQuerySchema = z.object({
  month: monthNum,
  year: yearNum,
});

export const messIdParamSchema = z.object({ messId: objectId });

export const monthParamSchema = z.object({
  messId: objectId,
  year: yearNum,
  month: monthNum,
});
