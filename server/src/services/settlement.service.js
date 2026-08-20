import prisma from "../config/database.js";
import AppError from "../utils/AppError.js";

// Get settlements by bill ID
export const getSettlementsByBill = async ({ userId, messId, billId }) => {
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

  const bill = await prisma.monthlyBill.findFirst({
    where: {
      id: billId,
      messId,
    },
  });

  if (!bill) {
    throw new AppError("Bill not found", 404);
  }

  const settlements = await prisma.settlement.findMany({
    where: {
      billId,
    },
    select: {
      id: true,
      billId: true,
      userId: true,
      mealCount: true,
      mealCost: true,
      expenseShare: true,
      totalAmount: true,
      paidAmount: true,
      dueAmount: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      totalAmount: "desc",
    },
  });

  return settlements;
};

// Get logged-in user's settlements
export const getMySettlements = async ({ userId, messId }) => {
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

  const settlements = await prisma.settlement.findMany({
    where: {
      userId,
      bill: {
        messId,
      },
    },
    select: {
      id: true,
      billId: true,
      userId: true,
      mealCount: true,
      mealCost: true,
      expenseShare: true,
      totalAmount: true,
      paidAmount: true,
      dueAmount: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      bill: {
        select: {
          id: true,
          month: true,
          year: true,
          totalMeals: true,
          totalExpense: true,
          mealRate: true,
          status: true,
        },
      },
    },
    orderBy: [
      { bill: { year: "desc" } },
      { bill: { month: "desc" } },
    ],
  });

  return settlements;
};

// Record a payment against a settlement
export const recordSettlementPayment = async ({ userId, messId, settlementId, amount }) => {
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

  const settlement = await prisma.settlement.findFirst({
    where: {
      id: settlementId,
      bill: {
        messId,
      },
    },
  });

  if (!settlement) {
    throw new AppError("Settlement not found", 404);
  }

  if (!amount || typeof amount !== "number" || amount <= 0) {
    throw new AppError("Payment amount must be a positive number", 400);
  }

  if (amount > settlement.dueAmount) {
    throw new AppError(`Payment amount cannot exceed due amount of ${settlement.dueAmount}`, 400);
  }

  const newPaidAmount = settlement.paidAmount + amount;
  const newDueAmount = settlement.totalAmount - newPaidAmount;

  let newStatus = "PARTIAL";

  if (newPaidAmount === 0) {
    newStatus = "UNPAID";
  } else if (newDueAmount <= 0) {
    newStatus = "PAID";
  }

  const updatedSettlement = await prisma.settlement.update({
    where: {
      id: settlementId,
    },
    data: {
      paidAmount: newPaidAmount,
      dueAmount: Math.max(0, newDueAmount),
      status: newStatus,
    },
    select: {
      id: true,
      billId: true,
      userId: true,
      mealCount: true,
      mealCost: true,
      expenseShare: true,
      totalAmount: true,
      paidAmount: true,
      dueAmount: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return updatedSettlement;
};
