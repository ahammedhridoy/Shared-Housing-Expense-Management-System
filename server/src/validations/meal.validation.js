import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "Invalid ID format");

const mealTypeEnum = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"], {
  errorMap: () => ({ message: "Meal type must be BREAKFAST, LUNCH, DINNER, or SNACK" }),
});

export const addMealSchema = z.object({
  date: z
    .string()
    .min(1, "Meal date is required")
    .datetime("Meal date must be a valid ISO 8601 datetime"),
  type: mealTypeEnum,
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(99, "Quantity must be at most 99")
    .optional()
    .default(1),
});

export const updateMealSchema = z
  .object({
    date: z
      .string()
      .datetime("Meal date must be a valid ISO 8601 datetime")
      .optional(),
    type: mealTypeEnum.optional(),
    quantity: z
      .number()
      .int("Quantity must be a whole number")
      .min(1, "Quantity must be at least 1")
      .max(99, "Quantity must be at most 99")
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const mealQuerySchema = z.object({
  startDate: z
    .string()
    .datetime("Start date must be a valid ISO 8601 datetime")
    .optional(),
  endDate: z
    .string()
    .datetime("End date must be a valid ISO 8601 datetime")
    .optional(),
  type: mealTypeEnum.optional(),
});

export const mealMessIdParamSchema = z.object({
  messId: objectId,
});

export const mealIdParamSchema = z.object({
  messId: objectId,
  mealId: objectId,
});
