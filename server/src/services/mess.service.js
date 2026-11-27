import prisma from "../config/database.js";
import AppError from "../utils/AppError.js";
import { requireMember } from "../utils/membership.js";

const messSelect = {
  id: true,
  name: true,
  description: true,
  address: true,
  createdAt: true,
  updatedAt: true,
};

export const createMess = async ({ userId, name, description, address, rentAmount }) => {
  const mess = await prisma.mess.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      address: address?.trim() || null,
      memberships: {
        create: { userId, role: "MANAGER", rentAmount: rentAmount ?? 0 },
      },
    },
    select: messSelect,
  });

  return { ...mess, role: "MANAGER" };
};

export const getMyMesses = async (userId) => {
  const memberships = await prisma.messMember.findMany({
    where: { userId, isActive: true },
    include: {
      mess: {
        select: {
          ...messSelect,
          _count: { select: { memberships: { where: { isActive: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return memberships.map(({ mess, role, id }) => {
    const { _count, ...rest } = mess;
    return { ...rest, role, membershipId: id, memberCount: _count.memberships };
  });
};

export const getMessDetails = async (userId, messId) => {
  const membership = await requireMember(userId, messId);

  const mess = await prisma.mess.findUnique({ where: { id: messId }, select: messSelect });
  if (!mess) throw new AppError("Mess not found", 404);

  return {
    ...mess,
    membership: { id: membership.id, role: membership.role, rentAmount: membership.rentAmount },
  };
};

export const updateMess = async ({ messId, name, description, address }) => {
  const data = {};
  if (name !== undefined) data.name = name.trim();
  if (description !== undefined) data.description = description?.trim() || null;
  if (address !== undefined) data.address = address?.trim() || null;

  return prisma.mess.update({ where: { id: messId }, data, select: messSelect });
};

const memberSelect = {
  id: true,
  role: true,
  rentAmount: true,
  isActive: true,
  joinedAt: true,
  leftAt: true,
  user: { select: { id: true, name: true, email: true } },
};

export const getMessMembers = async ({ userId, messId, includeFormer = false }) => {
  await requireMember(userId, messId);

  return prisma.messMember.findMany({
    where: { messId, ...(includeFormer ? {} : { isActive: true }) },
    select: memberSelect,
    orderBy: { joinedAt: "asc" },
  });
};

const activeManagers = (messId) =>
  prisma.messMember.count({ where: { messId, role: "MANAGER", isActive: true } });

// Set a member's room rent and/or role (manager only)
export const updateMember = async ({ messId, userId, rentAmount, role }) => {
  const membership = await prisma.messMember.findUnique({
    where: { userId_messId: { userId, messId } },
  });
  if (!membership || !membership.isActive) {
    throw new AppError("User is not a member of this mess", 404);
  }

  if (role === "MEMBER" && membership.role === "MANAGER" && (await activeManagers(messId)) <= 1) {
    throw new AppError("The mess needs at least one manager", 400);
  }

  const data = {};
  if (rentAmount !== undefined) data.rentAmount = rentAmount;
  if (role !== undefined) data.role = role;

  return prisma.messMember.update({ where: { id: membership.id }, data, select: memberSelect });
};

// Members are deactivated, not deleted, so their past months still add up
export const removeMessMember = async ({ messId, userId, managerId }) => {
  if (userId === managerId) {
    throw new AppError("A manager cannot remove themselves. Hand the manager role to someone first.", 400);
  }

  const membership = await prisma.messMember.findUnique({
    where: { userId_messId: { userId, messId } },
  });
  if (!membership || !membership.isActive) {
    throw new AppError("User is not a member of this mess", 404);
  }

  await prisma.messMember.update({
    where: { id: membership.id },
    data: { isActive: false, leftAt: new Date(), role: "MEMBER" },
  });
};

export const deleteMess = async ({ messId }) => {
  const mess = await prisma.mess.findUnique({ where: { id: messId } });
  if (!mess) throw new AppError("Mess not found", 404);

  await prisma.$transaction([
    prisma.settlement.deleteMany({ where: { bill: { messId } } }),
    prisma.monthlyBill.deleteMany({ where: { messId } }),
    prisma.deposit.deleteMany({ where: { messId } }),
    prisma.expense.deleteMany({ where: { messId } }),
    prisma.meal.deleteMany({ where: { messId } }),
    prisma.invitation.deleteMany({ where: { messId } }),
    prisma.messMember.deleteMany({ where: { messId } }),
    prisma.mess.delete({ where: { id: messId } }),
  ]);
};
