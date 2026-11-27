import crypto from "node:crypto";

import prisma from "../config/database.js";
import AppError from "../utils/AppError.js";
import { sendEmail } from "../utils/email.js";

const INVITE_TTL_DAYS = 7;

const clientUrl = () => (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
export const inviteUrl = (token) => `${clientUrl()}/invite/${token}`;

const escapeHtml = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Pending invitations past their expiry are marked EXPIRED so they stop
// blocking a new invite and stop showing up as pending.
const expireStale = (where) =>
  prisma.invitation.updateMany({
    where: { ...where, status: "PENDING", expiresAt: { lte: new Date() } },
    data: { status: "EXPIRED" },
  });

const sendInvitationEmail = async ({ email, token, messName, inviterName, expiresAt }) => {
  // Tests create many invitations; never hit SMTP from them
  if (process.env.NODE_ENV === "test") return false;

  try {
    const url = inviteUrl(token);
    await sendEmail({
      to: email,
      subject: `${inviterName} invited you to join ${messName}`,
      html: `
        <h2>You're invited to ${escapeHtml(messName)}</h2>
        <p>${escapeHtml(inviterName)} added you to the mess <b>${escapeHtml(messName)}</b> to share meals, bazar and house bills.</p>
        <p><a href="${url}">Open the invitation</a></p>
        <p>Sign up or log in with <b>${escapeHtml(email)}</b> to join. This invitation expires on ${expiresAt.toDateString()}.</p>
      `,
    });
    return true;
  } catch (error) {
    // The invitation still exists and can be shared by link
    console.error("Invitation email failed:", error.message);
    return false;
  }
};

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

    if (existingMembership?.isActive) {
      throw new AppError("This user is already a member of the mess", 409);
    }
  }

  await expireStale({ messId, email: normalizedEmail });

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

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

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
      mess: { select: { name: true } },
      inviter: { select: { name: true } },
    },
  });

  const emailSent = await sendInvitationEmail({
    email: normalizedEmail,
    token,
    messName: invitation.mess.name,
    inviterName: invitation.inviter.name,
    expiresAt,
  });

  const { mess, inviter, ...rest } = invitation;
  return { ...rest, inviteUrl: inviteUrl(token), emailSent };
};

// Public preview for the invite link: enough to show "X invited you to Y".
// The token is 32 random bytes, so knowing it is the permission.
export const getInvitationByToken = async (token) => {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      status: true,
      expiresAt: true,
      mess: { select: { id: true, name: true, address: true } },
      inviter: { select: { name: true } },
    },
  });

  if (!invitation) {
    throw new AppError("This invitation link is not valid", 404);
  }

  const expired = invitation.status === "PENDING" && invitation.expiresAt <= new Date();
  return { ...invitation, status: expired ? "EXPIRED" : invitation.status };
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

  if (!membership || !membership.isActive) {
    throw new AppError("You are not a member of this mess", 403);
  }

  await expireStale({ messId });

  const invitations = await prisma.invitation.findMany({
    where: { messId },
    select: {
      id: true,
      email: true,
      status: true,
      token: true,
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

  // Only managers reach this; they get a shareable link instead of the raw token
  return invitations.map(({ token, ...inv }) => ({ ...inv, inviteUrl: inviteUrl(token) }));
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

  if (existingMembership?.isActive) {
    throw new AppError("You are already a member of this mess", 409);
  }

  const result = await prisma.$transaction(async (tx) => {
    // A former member who is invited back is reactivated
    const membership = existingMembership
      ? await tx.messMember.update({
          where: { id: existingMembership.id },
          data: { isActive: true, leftAt: null, joinedAt: new Date(), role: "MEMBER" },
        })
      : await tx.messMember.create({
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

  if (!membership || !membership.isActive) {
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

export const rejectInvitation = async ({ invitationId, userId }) => {
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

  await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: "REJECTED" },
  });

  return { message: "Invitation rejected successfully" };
};
