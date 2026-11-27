import prisma from "../config/database.js";
import AppError from "../utils/AppError.js";
import { parseDay, formatDay, monthOf } from "../utils/dates.js";
import { requireMember } from "../utils/membership.js";

const depositSelect = {
  id: true,
  messId: true,
  userId: true,
  amount: true,
  method: true,
  note: true,
  date: true,
  month: true,
  year: true,
  createdAt: true,
  user: { select: { id: true, name: true } },
  recorder: { select: { id: true, name: true } },
};

const serialize = (d) => ({ ...d, date: formatDay(d.date) });

// Former members may still pay off what they owe, so any membership counts
const requireAnyMembership = async (userId, messId) => {
  const m = await prisma.messMember.findUnique({ where: { userId_messId: { userId, messId } } });
  if (!m) throw new AppError("Member is not part of this mess", 400);
};

export const addDeposit = async ({ userId, messId, payerId, amount, date, method, note, month, year }) => {
  await requireMember(userId, messId, { manager: true });
  await requireAnyMembership(payerId, messId);

  const day = parseDay(date, "Deposit date");
  const target = month && year ? { month, year } : monthOf(day);

  const deposit = await prisma.deposit.create({
    data: {
      messId,
      userId: payerId,
      recordedBy: userId,
      amount,
      method: method || "CASH",
      note: note?.trim() || null,
      date: day,
      month: target.month,
      year: target.year,
    },
    select: depositSelect,
  });

  return serialize(deposit);
};

export const getDeposits = async ({ userId, messId, month, year }) => {
  await requireMember(userId, messId);

  const deposits = await prisma.deposit.findMany({
    where: { messId, month, year },
    select: depositSelect,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return deposits.map(serialize);
};

const findDeposit = async (messId, depositId) => {
  const deposit = await prisma.deposit.findFirst({ where: { id: depositId, messId } });
  if (!deposit) throw new AppError("Deposit not found", 404);
  return deposit;
};

export const updateDeposit = async ({ userId, messId, depositId, payerId, amount, date, method, note, month, year }) => {
  await requireMember(userId, messId, { manager: true });
  await findDeposit(messId, depositId);

  const data = {};
  if (payerId !== undefined) {
    await requireAnyMembership(payerId, messId);
    data.userId = payerId;
  }
  if (amount !== undefined) data.amount = amount;
  if (method !== undefined) data.method = method;
  if (note !== undefined) data.note = note?.trim() || null;
  if (date !== undefined) data.date = parseDay(date, "Deposit date");
  if (month !== undefined) data.month = month;
  if (year !== undefined) data.year = year;

  const deposit = await prisma.deposit.update({
    where: { id: depositId },
    data,
    select: depositSelect,
  });

  return serialize(deposit);
};

export const deleteDeposit = async ({ userId, messId, depositId }) => {
  await requireMember(userId, messId, { manager: true });
  await findDeposit(messId, depositId);
  await prisma.deposit.delete({ where: { id: depositId } });
};
