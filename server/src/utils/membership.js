import prisma from "../config/database.js";
import AppError from "./AppError.js";
import { monthOf } from "./dates.js";

// Returns the caller's active membership, or throws 403.
export const requireMember = async (userId, messId, { manager = false } = {}) => {
  const membership = await prisma.messMember.findUnique({
    where: { userId_messId: { userId, messId } },
  });

  if (!membership || !membership.isActive) {
    throw new AppError("You are not a member of this mess", 403);
  }

  if (manager && membership.role !== "MANAGER") {
    throw new AppError("Only the mess manager can do this", 403);
  }

  return membership;
};

// Throws if the target user is not an active member of the mess.
export const requireActiveTarget = async (userId, messId, label = "User") => {
  const membership = await prisma.messMember.findUnique({
    where: { userId_messId: { userId, messId } },
  });

  if (!membership || !membership.isActive) {
    throw new AppError(`${label} is not a member of this mess`, 400);
  }

  return membership;
};

// Closed months are locked: meals and expenses dated inside them cannot change.
export const assertMonthOpen = async (messId, date) => {
  const { year, month } = monthOf(date);
  const bill = await prisma.monthlyBill.findUnique({
    where: { messId_month_year: { messId, month, year } },
    select: { id: true },
  });

  if (bill) {
    throw new AppError(
      `${year}-${String(month).padStart(2, "0")} is closed. Reopen the month to change it.`,
      409,
    );
  }
};
