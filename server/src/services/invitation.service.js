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

// Accept an invitation
export const acceptInvitation = async ({ token, userId }) => {
  const invitation = await prisma.invitation.findUnique({
    where: {
      token,
    },
  });

  if (!invitation) {
    const error = new Error("Invalid invitation");
    error.statusCode = 404;
    throw error;
  }

  if (invitation.status !== "PENDING") {
    const error = new Error(
      `Invitation has already been ${invitation.status.toLowerCase()}`,
    );

    error.statusCode = 400;
    throw error;
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({
      where: {
        id: invitation.id,
      },
      data: {
        status: "EXPIRED",
      },
    });

    const error = new Error("Invitation has expired");
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    const error = new Error(
      "This invitation was sent to a different email address",
    );

    error.statusCode = 403;
    throw error;
  }

  const existingMembership = await prisma.messMember.findUnique({
    where: {
      userId_messId: {
        userId,
        messId: invitation.messId,
      },
    },
  });

  if (existingMembership) {
    const error = new Error("You are already a member of this mess");

    error.statusCode = 409;
    throw error;
  }

  const result = await prisma.$transaction(async (tx) => {
    const membership = await tx.messMember.create({
      data: {
        userId,
        messId: invitation.messId,
        role: "MEMBER",
      },
    });

    await tx.invitation.update({
      where: {
        id: invitation.id,
      },
      data: {
        status: "ACCEPTED",
      },
    });

    return membership;
  });

  return result;
};
