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

export const invitationIdParamSchema = z.object({
  invitationId: objectId,
});

export const invitationTokenParamSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/i, "Invalid invitation link"),
});
