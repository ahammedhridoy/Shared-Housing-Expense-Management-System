import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "Invalid ID format");

const expenseCategoryEnum = z.enum(
  [
    "FOOD",
    "RENT",
    "ELECTRICITY",
    "GAS",
    "WATER",
    "INTERNET",
    "MAINTENANCE",
    "MAID_COST",
    "OTHER",
  ],
  {
    errorMap: () => ({ message: "Invalid expense category" }),
  }
);

export const addExpenseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Expense title is required")
    .max(200, "Title must be at most 200 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .nullable(),
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .max(99999999.99, "Amount is too large"),
  category: expenseCategoryEnum,
  date: z
    .string()
    .min(1, "Expense date is required")
    .datetime("Date must be a valid ISO 8601 datetime"),
});

export const updateExpenseSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty")
      .max(200, "Title must be at most 200 characters")
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, "Description must be at most 500 characters")
      .optional()
      .nullable(),
    amount: z
      .number()
      .positive("Amount must be greater than 0")
      .max(99999999.99, "Amount is too large")
      .optional(),
    category: expenseCategoryEnum.optional(),
    date: z
      .string()
      .datetime("Date must be a valid ISO 8601 datetime")
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const expenseQuerySchema = z.object({
  startDate: z
    .string()
    .datetime("Start date must be a valid ISO 8601 datetime")
    .optional(),
  endDate: z
    .string()
    .datetime("End date must be a valid ISO 8601 datetime")
    .optional(),
  category: expenseCategoryEnum.optional(),
});

export const expenseMessIdParamSchema = z.object({
  messId: objectId,
});

export const expenseIdParamSchema = z.object({
  messId: objectId,
  expenseId: objectId,
});
