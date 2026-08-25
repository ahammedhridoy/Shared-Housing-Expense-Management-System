import { z } from "zod"

export const createPaymentSchema = z.object({
  payerId: z.string().min(1, "Payer is required"),
  amount: z
    .number("Amount must be a number")
    .min(1, "Amount must be at least 1"),
  date: z.string().min(1, "Date is required"),
  note: z
    .string()
    .max(200, "Note must be 200 characters or less")
    .optional()
    .or(z.literal("")),
})

export type CreatePaymentFormData = z.infer<typeof createPaymentSchema>

export const updatePaymentSchema = z.object({
  amount: z
    .number("Amount must be a number")
    .min(1, "Amount must be at least 1")
    .optional(),
  note: z
    .string()
    .max(200, "Note must be 200 characters or less")
    .optional()
    .or(z.literal("")),
})

export type UpdatePaymentFormData = z.infer<typeof updatePaymentSchema>
