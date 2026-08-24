import { z } from "zod"

export const updateMealSchema = z.object({
  type: z.enum(["BREAKFAST", "LUNCH", "DINNER"], "Meal type is required"),
  quantity: z
    .number("Quantity must be a number")
    .min(0.5, "Quantity must be at least 0.5")
    .max(50, "Quantity must be 50 or less"),
})

export type UpdateMealFormData = z.infer<typeof updateMealSchema>
