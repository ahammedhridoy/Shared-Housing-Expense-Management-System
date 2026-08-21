import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "Invalid ID format");

const paymentMethodEnum = z.enum(["CASH", "BANK", "MOBILE_BANKING", "OTHER"], {
  errorMap: () => ({ message: "Payment method must be CASH, BANK, MOBILE_BANKING, or OTHER" }),
});

export const addPaymentSchema = z.object({
  payerId: objectId,
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .max(99999999.99, "Amount is too large"),
  date: z
    .string()
    .min(1, "Payment date is required")
    .datetime("Date must be a valid ISO 8601 datetime"),
  method: paymentMethodEnum,
  note: z
    .string()
    .trim()
    .max(500, "Note must be at most 500 characters")
    .optional()
    .nullable(),
});

export const updatePaymentSchema = z
  .object({
    payerId: objectId.optional(),
    amount: z
      .number()
      .positive("Amount must be greater than 0")
      .max(99999999.99, "Amount is too large")
      .optional(),
    date: z
      .string()
      .datetime("Date must be a valid ISO 8601 datetime")
      .optional(),
    method: paymentMethodEnum.optional(),
    note: z
      .string()
      .trim()
      .max(500, "Note must be at most 500 characters")
      .optional()
      .nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const paymentQuerySchema = z.object({
  startDate: z
    .string()
    .datetime("Start date must be a valid ISO 8601 datetime")
    .optional(),
  endDate: z
    .string()
    .datetime("End date must be a valid ISO 8601 datetime")
    .optional(),
  method: paymentMethodEnum.optional(),
});

export const paymentMessIdParamSchema = z.object({
  messId: objectId,
});

export const paymentIdParamSchema = z.object({
  messId: objectId,
  paymentId: objectId,
});
