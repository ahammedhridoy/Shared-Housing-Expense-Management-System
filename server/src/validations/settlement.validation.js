import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "Invalid ID format");

export const recordSettlementPaymentSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .max(99999999.99, "Amount is too large"),
});

export const settlementMessIdParamSchema = z.object({
  messId: objectId,
});

export const settlementBillIdParamSchema = z.object({
  messId: objectId,
  billId: objectId,
});

export const settlementIdParamSchema = z.object({
  messId: objectId,
  settlementId: objectId,
});
