import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "Invalid ID format");

const monthValidator = z
  .number()
  .int("Month must be a whole number")
  .min(1, "Month must be between 1 and 12")
  .max(12, "Month must be between 1 and 12");

const yearValidator = z
  .number()
  .int("Year must be a whole number")
  .min(2000, "Year must be 2000 or later")
  .max(2100, "Year must be 2100 or earlier");

export const finalizeMonthSchema = z.object({
  month: monthValidator,
  year: yearValidator,
});

export const monthlyBillParamSchema = z.object({
  messId: objectId,
  month: z.coerce.number().int("Month must be a whole number").min(1, "Month must be between 1 and 12").max(12, "Month must be between 1 and 12"),
  year: z.coerce.number().int("Year must be a whole number").min(2000, "Year must be 2000 or later").max(2100, "Year must be 2100 or earlier"),
});

export const monthlyBillMessIdParamSchema = z.object({
  messId: objectId,
});
