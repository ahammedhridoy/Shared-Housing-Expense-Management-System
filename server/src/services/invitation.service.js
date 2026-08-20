import crypto from "node:crypto";

import prisma from "../config/database.js";

export const createInvitation = async ({ messId, invitedBy, email }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (user) {
    const existingMembership = await prisma.messMember.findUnique({
      where: {
        userId_messId: {
          userId: user.id,
          messId,
        },
      },
    });

    if (existingMembership) {
      const error = new Error("This user is already a member of the mess");

      error.statusCode = 409;

      throw error;
    }
  }

  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      messId,
      email: normalizedEmail,
      status: "PENDING",
    },
  });

  if (existingInvitation) {
    const error = new Error(
      "A pending invitation already exists for this email",
    );

    error.statusCode = 409;

    throw error;
  }

  const token = crypto.randomBytes(32).toString("hex");

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const invitation = await prisma.invitation.create({
    data: {
      messId,
      invitedBy,
      email: normalizedEmail,
      token,
      expiresAt,
    },
    select: {
      id: true,
      messId: true,
      email: true,
      status: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return invitation;
};
