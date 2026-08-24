import { z } from "zod"

export const updateMessSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(200, "Address must be 200 characters or less")
    .optional()
    .or(z.literal("")),
})

export type UpdateMessFormData = z.infer<typeof updateMessSchema>
