import crypto from "node:crypto";

import prisma from "../config/database.js";
import AppError from "../utils/AppError.js";

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
      throw new AppError("This user is already a member of the mess", 409);
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
    throw new AppError("A pending invitation already exists for this email", 409);
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

export const getPendingInvitations = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const invitations = await prisma.invitation.findMany({
    where: {
      email: user.email.toLowerCase(),
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      email: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      mess: {
        select: {
          id: true,
          name: true,
          description: true,
          address: true,
        },
      },
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return invitations;
};

export const getMessInvitations = async ({ messId, userId }) => {
  const membership = await prisma.messMember.findUnique({
    where: {
      userId_messId: {
        userId,
        messId,
      },
    },
  });

  if (!membership) {
    throw new AppError("You are not a member of this mess", 403);
  }

  const invitations = await prisma.invitation.findMany({
    where: { messId },
    select: {
      id: true,
      email: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return invitations;
};

export const acceptInvitation = async ({ invitationId, userId }) => {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new AppError("Invitation not found", 404);
  }

  if (invitation.status !== "PENDING") {
    throw new AppError(`Invitation has already been ${invitation.status.toLowerCase()}`, 400);
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });

    throw new AppError("Invitation has expired", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new AppError("This invitation was sent to a different email address", 403);
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
    throw new AppError("You are already a member of this mess", 409);
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
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    });

    return membership;
  });

  return result;
};

export const cancelInvitation = async ({ invitationId, userId }) => {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new AppError("Invitation not found", 404);
  }

  const membership = await prisma.messMember.findUnique({
    where: {
      userId_messId: {
        userId,
        messId: invitation.messId,
      },
    },
  });

  if (!membership) {
    throw new AppError("You are not a member of this mess", 403);
  }

  if (membership.role !== "MANAGER" && membership.userId !== invitation.invitedBy) {
    throw new AppError("Only the manager or the inviter can cancel this invitation", 403);
  }

  if (invitation.status !== "PENDING") {
    throw new AppError(`Invitation has already been ${invitation.status.toLowerCase()}`, 400);
  }

  await prisma.invitation.delete({
    where: { id: invitationId },
  });

  return { message: "Invitation cancelled successfully" };
};
