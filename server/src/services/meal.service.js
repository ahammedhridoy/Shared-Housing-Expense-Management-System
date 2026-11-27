import prisma from "../config/database.js";
import AppError from "../utils/AppError.js";
import { parseDay, formatDay, monthRange, monthOf } from "../utils/dates.js";
import { requireMember } from "../utils/membership.js";

// All meal entries of a month (every member can see the whole mess)
export const getMonthMeals = async ({ userId, messId, month, year }) => {
  await requireMember(userId, messId);
  const { start, end } = monthRange(year, month);

  const meals = await prisma.meal.findMany({
    where: { messId, date: { gte: start, lt: end } },
    select: { id: true, userId: true, date: true, count: true },
    orderBy: { date: "asc" },
  });

  return meals.map((m) => ({ ...m, date: formatDay(m.date) }));
};

// Upsert meal counts (manager only). count 0 removes the entry.
export const setMeals = async ({ userId, messId, entries }) => {
  await requireMember(userId, messId, { manager: true });

  const parsed = entries.map((e) => ({ ...e, day: parseDay(e.date, "Meal date") }));

  // Every target must be a member (active or former) of this mess
  const targetIds = [...new Set(parsed.map((e) => e.userId))];
  const members = await prisma.messMember.findMany({
    where: { messId, userId: { in: targetIds } },
    select: { userId: true },
  });
  const known = new Set(members.map((m) => m.userId));
  const unknown = targetIds.filter((id) => !known.has(id));
  if (unknown.length > 0) {
    throw new AppError("One or more users are not members of this mess", 400);
  }

  // Refuse writes into closed months
  const months = [...new Map(parsed.map((e) => {
    const m = monthOf(e.day);
    return [`${m.year}-${m.month}`, m];
  })).values()];
  const closed = await prisma.monthlyBill.findMany({
    where: { messId, OR: months.map((m) => ({ year: m.year, month: m.month })) },
    select: { year: true, month: true },
  });
  if (closed.length > 0) {
    const c = closed[0];
    throw new AppError(
      `${c.year}-${String(c.month).padStart(2, "0")} is closed. Reopen the month to change meals.`,
      409,
    );
  }

  await prisma.$transaction(
    parsed.map((e) =>
      e.count === 0
        ? prisma.meal.deleteMany({ where: { messId, userId: e.userId, date: e.day } })
        : prisma.meal.upsert({
            where: { messId_userId_date: { messId, userId: e.userId, date: e.day } },
            create: { messId, userId: e.userId, date: e.day, count: e.count },
            update: { count: e.count },
          }),
    ),
  );

  return { updated: parsed.length };
};
