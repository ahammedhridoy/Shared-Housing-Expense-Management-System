import { z } from "zod";
import { objectId, day } from "./common.js";

export const mealCount = z
  .number({ error: "Meal count must be a number" })
  .min(0, "Meal count cannot be negative")
  .max(50, "Meal count is too large (max 50 per day)")
  .refine((n) => Number.isInteger(n * 2), "Meal count must be a whole or half number (e.g. 1.5)");

// Set meal counts for one or more member-days. count 0 clears the entry.
export const setMealsSchema = z.object({
  entries: z
    .array(
      z.object({
        userId: objectId,
        date: day,
        count: mealCount,
      }),
    )
    .min(1, "At least one entry is required")
    .max(1000, "Too many entries in one request"),
});
