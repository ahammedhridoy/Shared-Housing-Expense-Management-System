import { z } from "zod";
import { objectId, day, money, monthNum, yearNum } from "./common.js";

const methodEnum = z.enum(["CASH", "BKASH", "NAGAD", "ROCKET", "BANK", "OTHER"], {
  error: "Invalid payment method",
});

export const addDepositSchema = z.object({
  userId: objectId,
  amount: money,
  date: day,
  method: methodEnum.optional().default("CASH"),
  note: z.string().trim().max(300, "Note must be at most 300 characters").optional().nullable(),
  // Month the deposit settles; defaults to the month of `date`
  month: monthNum.optional(),
  year: yearNum.optional(),
});

export const updateDepositSchema = z
  .object({
    userId: objectId.optional(),
    amount: money.optional(),
    date: day.optional(),
    method: methodEnum.optional(),
    note: z.string().trim().max(300).optional().nullable(),
    month: monthNum.optional(),
    year: yearNum.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const depositQuerySchema = z.object({
  month: monthNum,
  year: yearNum,
});

export const depositIdParamSchema = z.object({
  messId: objectId,
  depositId: objectId,
});
