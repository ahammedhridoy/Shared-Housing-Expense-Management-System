import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "Invalid ID format");

export const createInvitationSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email format"),
});

export const invitationMessIdParamSchema = z.object({
  messId: objectId,
});

export const acceptInvitationParamSchema = z.object({
  token: z
    .string()
    .min(1, "Invitation token is required")
    .regex(/^[0-9a-f]+$/i, "Invalid token format"),
});
