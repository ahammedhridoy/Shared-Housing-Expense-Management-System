import { z } from "zod"

export const paySettlementSchema = z.object({
  amount: z
    .number("Amount must be a number")
    .min(1, "Amount must be at least 1"),
  method: z
    .string()
    .max(100, "Method must be 100 characters or less")
    .optional()
    .or(z.literal("")),
})

export type PaySettlementFormData = z.infer<typeof paySettlementSchema>
