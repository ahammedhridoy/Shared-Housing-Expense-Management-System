import prisma from "../config/database.js";
import AppError from "../utils/AppError.js";

// Finalize a month (creates MonthlyBill + Settlements)
export const finalizeMonth = async ({ userId, messId, month, year }) => {
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

  if (membership.role !== "MANAGER") {
    throw new AppError("Only mess managers can finalize months", 403);
  }

  if (!month || !year) {
    throw new AppError("Month and year are required", 400);
  }

  const monthNum = Number(month);
  const yearNum = Number(year);

  if (monthNum < 1 || monthNum > 12) {
    throw new AppError("Month must be between 1 and 12", 400);
  }

  const existingBill = await prisma.monthlyBill.findUnique({
    where: {
      messId_month_year: {
        messId,
        month: monthNum,
        year: yearNum,
      },
    },
  });

  if (existingBill) {
    throw new AppError("This month has already been finalized", 400);
  }

  const startDate = new Date(yearNum, monthNum - 1, 1);
  const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

  const totalExpenseResult = await prisma.expense.aggregate({
    where: {
      messId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      amount: true,
    },
  });

  const totalExpense = totalExpenseResult._sum.amount || 0;

  const meals = await prisma.meal.groupBy({
    by: ["userId"],
    where: {
      messId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      quantity: true,
    },
  });

  const totalMealsResult = await prisma.meal.aggregate({
    where: {
      messId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      quantity: true,
    },
  });

  const totalMeals = totalMealsResult._sum.quantity || 0;

  if (totalMeals === 0) {
    throw new AppError("No meals found for this month. Cannot finalize.", 400);
  }

  const mealRate = totalExpense / totalMeals;

  const bill = await prisma.monthlyBill.create({
    data: {
      messId,
      month: monthNum,
      year: yearNum,
      totalMeals,
      totalExpense,
      mealRate,
      status: "FINALIZED",
    },
  });

  const settlements = [];

  for (const meal of meals) {
    const mealCount = meal._sum.quantity || 0;
    const mealCost = mealCount * mealRate;
    const expenseShare = totalExpense / meals.length;

    const settlement = await prisma.settlement.create({
      data: {
        billId: bill.id,
        userId: meal.userId,
        mealCount,
        mealCost,
        expenseShare,
        totalAmount: mealCost + expenseShare,
        paidAmount: 0,
        dueAmount: mealCost + expenseShare,
        status: "UNPAID",
      },
      select: {
        id: true,
        userId: true,
        mealCount: true,
        mealCost: true,
        expenseShare: true,
        totalAmount: true,
        paidAmount: true,
        dueAmount: true,
        status: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    settlements.push(settlement);
  }

  return {
    bill: {
      id: bill.id,
      messId: bill.messId,
      month: bill.month,
      year: bill.year,
      totalMeals: bill.totalMeals,
      totalExpense: bill.totalExpense,
      mealRate: bill.mealRate,
      status: bill.status,
      createdAt: bill.createdAt,
      updatedAt: bill.updatedAt,
    },
    settlements,
  };
};

// Get monthly bill by month and year
export const getMonthlyBill = async ({ userId, messId, month, year }) => {
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

  const monthNum = Number(month);
  const yearNum = Number(year);

  const bill = await prisma.monthlyBill.findUnique({
    where: {
      messId_month_year: {
        messId,
        month: monthNum,
        year: yearNum,
      },
    },
    select: {
      id: true,
      messId: true,
      month: true,
      year: true,
      totalMeals: true,
      totalExpense: true,
      mealRate: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      settlements: {
        select: {
          id: true,
          userId: true,
          mealCount: true,
          mealCost: true,
          expenseShare: true,
          totalAmount: true,
          paidAmount: true,
          dueAmount: true,
          status: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!bill) {
    throw new AppError("No bill found for this month", 404);
  }

  return bill;
};

// Get all bills of a mess
export const getMessBills = async ({ userId, messId }) => {
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

  const bills = await prisma.monthlyBill.findMany({
    where: {
      messId,
    },
    select: {
      id: true,
      messId: true,
      month: true,
      year: true,
      totalMeals: true,
      totalExpense: true,
      mealRate: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [
      { year: "desc" },
      { month: "desc" },
    ],
  });

  return bills;
};
