import prisma from "../config/database.js";
import AppError from "../utils/AppError.js";
import { monthRange } from "../utils/dates.js";
import { requireMember } from "../utils/membership.js";
import { calculateMonth, round2 } from "../utils/billing.js";

const label = (year, month) => `${year}-${String(month).padStart(2, "0")}`;

const findBill = (messId, year, month) =>
  prisma.monthlyBill.findUnique({
    where: { messId_month_year: { messId, month, year } },
    include: { settlements: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });

const depositsFor = (messId, year, month) =>
  prisma.deposit.findMany({ where: { messId, year, month }, select: { userId: true, amount: true } });

// Live calculation from the raw data of an open month
const liveSummary = async (messId, year, month) => {
  const { start, end } = monthRange(year, month);

  const [allMemberships, meals, expenses, deposits] = await Promise.all([
    prisma.messMember.findMany({
      where: {
        messId,
        // On MongoDB `null` does not match a missing field, so check both
        OR: [{ leftAt: { isSet: false } }, { leftAt: null }, { leftAt: { gte: start } }],
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.meal.findMany({ where: { messId, date: { gte: start, lt: end } }, select: { userId: true, count: true } }),
    prisma.expense.findMany({
      where: { messId, date: { gte: start, lt: end } },
      select: { kind: true, amount: true, paidById: true, shares: true },
    }),
    depositsFor(messId, year, month),
  ]);

  // A member belongs to the month if they had joined before it ended, or if they
  // already have data in it (e.g. a mess that was set up late and back-filled).
  const withData = new Set([
    ...meals.map((m) => m.userId),
    ...deposits.map((d) => d.userId),
    ...expenses.flatMap((e) => [e.paidById, ...(e.shares || []).map((s) => s.userId)]).filter(Boolean),
  ]);
  const memberships = allMemberships.filter((m) => m.joinedAt < end || withData.has(m.userId));

  const result = calculateMonth({
    members: memberships.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      rentAmount: m.rentAmount,
    })),
    meals,
    expenses,
    deposits,
  });

  // Name anyone who has data this month but is no longer listed
  const missing = result.members.filter((m) => !m.name).map((m) => m.userId);
  if (missing.length > 0) {
    const users = await prisma.user.findMany({ where: { id: { in: missing } }, select: { id: true, name: true, email: true } });
    const byId = new Map(users.map((u) => [u.id, u]));
    for (const row of result.members) {
      if (!row.name && byId.has(row.userId)) {
        row.name = byId.get(row.userId).name;
        row.email = byId.get(row.userId).email;
      }
    }
  }

  return result;
};

// Closed month: frozen charges + deposits as they stand now
const closedSummary = async (bill) => {
  const deposits = await depositsFor(bill.messId, bill.year, bill.month);
  const paid = new Map();
  for (const d of deposits) paid.set(d.userId, (paid.get(d.userId) || 0) + d.amount);

  const members = bill.settlements.map((s) => {
    const deposit = paid.get(s.userId) || 0;
    const totalPaid = s.expenseCredit + deposit;
    return {
      userId: s.userId,
      name: s.user?.name ?? null,
      email: s.user?.email ?? null,
      isMember: true,
      mealCount: s.mealCount,
      mealCost: s.mealCost,
      rent: s.rent,
      houseShare: s.houseShare,
      totalCharge: s.totalCharge,
      expenseCredit: s.expenseCredit,
      deposit: round2(deposit),
      totalPaid: round2(totalPaid),
      balance: round2(totalPaid - s.totalCharge),
    };
  });

  const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);

  return {
    totals: {
      totalMeals: bill.totalMeals,
      mealExpense: bill.mealExpense,
      mealRate: bill.mealRate,
      houseExpense: bill.houseExpense,
      totalRent: bill.totalRent,
      totalCharge: round2(bill.mealExpense + bill.houseExpense + bill.totalRent),
      totalDeposits: round2(totalDeposits),
    },
    members,
    warnings: [],
  };
};

export const getMonthSummary = async ({ userId, messId, year, month }) => {
  await requireMember(userId, messId);

  const bill = await findBill(messId, year, month);
  const summary = bill ? await closedSummary(bill) : await liveSummary(messId, year, month);

  summary.members.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return {
    year,
    month,
    status: bill ? "CLOSED" : "OPEN",
    closedAt: bill?.closedAt ?? null,
    ...summary,
  };
};

export const closeMonth = async ({ userId, messId, year, month }) => {
  await requireMember(userId, messId, { manager: true });

  const { start } = monthRange(year, month);
  if (start > new Date()) {
    throw new AppError("You cannot close a month that has not started yet", 400);
  }

  if (await findBill(messId, year, month)) {
    throw new AppError(`${label(year, month)} is already closed`, 409);
  }

  const { totals, members } = await liveSummary(messId, year, month);

  await prisma.$transaction(async (tx) => {
    const bill = await tx.monthlyBill.create({
      data: {
        messId,
        year,
        month,
        totalMeals: totals.totalMeals,
        mealExpense: totals.mealExpense,
        mealRate: totals.mealRate,
        houseExpense: totals.houseExpense,
        totalRent: totals.totalRent,
        closedBy: userId,
      },
    });

    if (members.length > 0) {
      await tx.settlement.createMany({
        data: members.map((m) => ({
          billId: bill.id,
          userId: m.userId,
          mealCount: m.mealCount,
          mealCost: m.mealCost,
          rent: m.rent,
          houseShare: m.houseShare,
          totalCharge: m.totalCharge,
          expenseCredit: m.expenseCredit,
        })),
      });
    }
  });

  return getMonthSummary({ userId, messId, year, month });
};

export const reopenMonth = async ({ userId, messId, year, month }) => {
  await requireMember(userId, messId, { manager: true });

  const bill = await findBill(messId, year, month);
  if (!bill) {
    throw new AppError(`${label(year, month)} is not closed`, 404);
  }

  await prisma.$transaction([
    prisma.settlement.deleteMany({ where: { billId: bill.id } }),
    prisma.monthlyBill.delete({ where: { id: bill.id } }),
  ]);

  return getMonthSummary({ userId, messId, year, month });
};

// Closed months, newest first, with the caller's balance for each
export const listClosedMonths = async ({ userId, messId }) => {
  await requireMember(userId, messId);

  const bills = await prisma.monthlyBill.findMany({
    where: { messId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { settlements: { where: { userId } } },
  });

  const deposits = await prisma.deposit.groupBy({
    by: ["year", "month"],
    where: { messId, userId },
    _sum: { amount: true },
  });
  const paid = new Map(deposits.map((d) => [`${d.year}-${d.month}`, d._sum.amount || 0]));

  return bills.map((b) => {
    const mine = b.settlements[0];
    const myPaid = mine ? mine.expenseCredit + (paid.get(`${b.year}-${b.month}`) || 0) : 0;
    return {
      year: b.year,
      month: b.month,
      closedAt: b.closedAt,
      totalMeals: b.totalMeals,
      mealRate: b.mealRate,
      totalCharge: round2(b.mealExpense + b.houseExpense + b.totalRent),
      myCharge: mine ? mine.totalCharge : 0,
      myBalance: mine ? round2(myPaid - mine.totalCharge) : 0,
    };
  });
};
