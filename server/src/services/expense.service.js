import prisma from "../config/database.js";
import AppError from "../utils/AppError.js";
import { parseDay, formatDay, monthRange } from "../utils/dates.js";
import { requireMember, requireActiveTarget, assertMonthOpen } from "../utils/membership.js";
import { round2 } from "../utils/billing.js";
import { MEAL_CATEGORIES, HOUSE_CATEGORIES } from "../validations/expense.validation.js";

const expenseSelect = {
  id: true,
  messId: true,
  kind: true,
  category: true,
  title: true,
  description: true,
  amount: true,
  date: true,
  shares: true,
  paidById: true,
  createdAt: true,
  updatedAt: true,
  paidBy: { select: { id: true, name: true } },
  recorder: { select: { id: true, name: true } },
};

const serialize = (e) => ({ ...e, date: formatDay(e.date) });

const checkKindCategory = (kind, category) => {
  const allowed = kind === "MEAL" ? MEAL_CATEGORIES : HOUSE_CATEGORIES;
  if (!allowed.includes(category)) {
    throw new AppError(
      kind === "MEAL"
        ? "Bazar expenses must use the BAZAR category"
        : `House bill category must be one of: ${HOUSE_CATEGORIES.join(", ")}`,
      400,
    );
  }
};

const checkShares = async (messId, kind, amount, shares) => {
  if (!shares || shares.length === 0) return [];
  if (kind !== "HOUSE") {
    throw new AppError("Custom shares are only allowed on house bills", 400);
  }

  const ids = shares.map((s) => s.userId);
  if (new Set(ids).size !== ids.length) {
    throw new AppError("Each member can appear only once in the shares", 400);
  }

  const total = round2(shares.reduce((sum, s) => sum + s.amount, 0));
  if (Math.abs(total - round2(amount)) > 0.01) {
    throw new AppError(`Shares add up to ${total} but the bill is ${round2(amount)}`, 400);
  }

  const count = await prisma.messMember.count({ where: { messId, userId: { in: ids } } });
  if (count !== ids.length) {
    throw new AppError("Shares can only include members of this mess", 400);
  }

  return shares.filter((s) => s.amount > 0);
};

export const addExpense = async ({ userId, messId, kind, category, title, description, amount, date, paidById, shares }) => {
  await requireMember(userId, messId, { manager: true });
  checkKindCategory(kind, category);

  const day = parseDay(date, "Expense date");
  await assertMonthOpen(messId, day);

  if (paidById) await requireActiveTarget(paidById, messId, "Payer");
  const cleanShares = await checkShares(messId, kind, amount, shares);

  const expense = await prisma.expense.create({
    data: {
      messId,
      recordedBy: userId,
      paidById: paidById || null,
      kind,
      category,
      title: title.trim(),
      description: description?.trim() || null,
      amount,
      date: day,
      shares: cleanShares,
    },
    select: expenseSelect,
  });

  return serialize(expense);
};

export const getExpenses = async ({ userId, messId, month, year, kind }) => {
  await requireMember(userId, messId);
  const { start, end } = monthRange(year, month);

  const expenses = await prisma.expense.findMany({
    where: { messId, date: { gte: start, lt: end }, ...(kind ? { kind } : {}) },
    select: expenseSelect,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return expenses.map(serialize);
};

const findExpense = async (messId, expenseId) => {
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, messId } });
  if (!expense) throw new AppError("Expense not found", 404);
  return expense;
};

export const updateExpense = async ({ userId, messId, expenseId, ...changes }) => {
  await requireMember(userId, messId, { manager: true });
  const existing = await findExpense(messId, expenseId);
  await assertMonthOpen(messId, existing.date);

  const kind = changes.kind ?? existing.kind;
  const category = changes.category ?? (changes.kind && changes.kind !== existing.kind
    ? (kind === "MEAL" ? "BAZAR" : "OTHER")
    : existing.category);
  checkKindCategory(kind, category);

  const data = { kind, category };

  if (changes.title !== undefined) data.title = changes.title.trim();
  if (changes.description !== undefined) data.description = changes.description?.trim() || null;
  if (changes.amount !== undefined) data.amount = changes.amount;

  if (changes.date !== undefined) {
    data.date = parseDay(changes.date, "Expense date");
    await assertMonthOpen(messId, data.date);
  }

  if (changes.paidById !== undefined) {
    if (changes.paidById) await requireActiveTarget(changes.paidById, messId, "Payer");
    data.paidById = changes.paidById || null;
  }

  const amount = data.amount ?? existing.amount;
  if (kind === "MEAL") {
    data.shares = [];
  } else if (changes.shares !== undefined) {
    data.shares = await checkShares(messId, kind, amount, changes.shares);
  } else if (data.amount !== undefined && existing.shares.length > 0) {
    // Amount changed but the old custom split no longer adds up
    await checkShares(messId, kind, amount, existing.shares);
  }

  const expense = await prisma.expense.update({
    where: { id: expenseId },
    data,
    select: expenseSelect,
  });

  return serialize(expense);
};

export const deleteExpense = async ({ userId, messId, expenseId }) => {
  await requireMember(userId, messId, { manager: true });
  const existing = await findExpense(messId, expenseId);
  await assertMonthOpen(messId, existing.date);

  await prisma.expense.delete({ where: { id: expenseId } });
};
