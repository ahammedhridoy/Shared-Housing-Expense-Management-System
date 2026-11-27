import { z } from "zod";
import { objectId, day, money, monthNum, yearNum } from "./common.js";

export const MEAL_CATEGORIES = ["BAZAR"];
export const HOUSE_CATEGORIES = ["ELECTRICITY", "GAS", "WATER", "INTERNET", "MAID", "SERVICE", "OTHER"];

const kindEnum = z.enum(["MEAL", "HOUSE"], { error: "Kind must be MEAL or HOUSE" });
const categoryEnum = z.enum([...MEAL_CATEGORIES, ...HOUSE_CATEGORIES], {
  error: "Invalid expense category",
});

const shares = z
  .array(z.object({ userId: objectId, amount: z.number().min(0, "Share cannot be negative") }))
  .max(100);

const base = {
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be at most 200 characters"),
  description: z.string().trim().max(500, "Description must be at most 500 characters").optional().nullable(),
  amount: money,
  date: day,
  // null = paid from the mess fund
  paidById: objectId.nullable().optional(),
  shares: shares.optional(),
};

export const addExpenseSchema = z.object({
  kind: kindEnum,
  category: categoryEnum,
  ...base,
});

export const updateExpenseSchema = z
  .object({
    kind: kindEnum.optional(),
    category: categoryEnum.optional(),
    title: base.title.optional(),
    description: base.description,
    amount: money.optional(),
    date: day.optional(),
    paidById: base.paidById,
    shares: base.shares,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const expenseQuerySchema = z.object({
  month: monthNum,
  year: yearNum,
  kind: kindEnum.optional(),
});

export const expenseIdParamSchema = z.object({
  messId: objectId,
  expenseId: objectId,
});
