import { z } from "zod"

export const createExpenseSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .or(z.literal("")),
  amount: z
    .number("Amount must be a number")
    .min(1, "Amount must be at least 1"),
  category: z.string().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
})

export type CreateExpenseFormData = z.infer<typeof createExpenseSchema>

export const updateExpenseSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .or(z.literal("")),
  amount: z
    .number("Amount must be a number")
    .min(1, "Amount must be at least 1"),
  category: z.string().min(1, "Category is required"),
})

export type UpdateExpenseFormData = z.infer<typeof updateExpenseSchema>
