import prisma from "../config/database.js";
import AppError from "../utils/AppError.js";

const VALID_CATEGORIES = [
  "FOOD",
  "RENT",
  "ELECTRICITY",
  "GAS",
  "WATER",
  "INTERNET",
  "MAINTENANCE",
  "MAID_COST",
  "OTHER",
];

// Add an expense to a mess (manager only)
export const addExpense = async ({
  userId,
  messId,
  title,
  description,
  amount,
  category,
  date,
}) => {
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
    throw new AppError("Only mess managers can add expenses", 403);
  }

  if (!title || title.trim().length === 0) {
    throw new AppError("Expense title is required", 400);
  }

  if (amount === undefined || amount === null) {
    throw new AppError("Expense amount is required", 400);
  }

  if (typeof amount !== "number" || amount <= 0) {
    throw new AppError("Expense amount must be a positive number", 400);
  }

  if (!category) {
    throw new AppError("Expense category is required", 400);
  }

  if (!VALID_CATEGORIES.includes(category)) {
    throw new AppError(
      `Invalid expense category. Valid categories: ${VALID_CATEGORIES.join(", ")}`,
      400,
    );
  }

  if (!date) {
    throw new AppError("Expense date is required", 400);
  }

  const expenseDate = new Date(date);

  if (Number.isNaN(expenseDate.getTime())) {
    throw new AppError("Invalid expense date", 400);
  }

  const expense = await prisma.expense.create({
    data: {
      messId,
      recordedBy: userId,
      title: title.trim(),
      description: description?.trim() || null,
      amount,
      category,
      date: expenseDate,
    },
    select: {
      id: true,
      messId: true,
      recordedBy: true,
      title: true,
      description: true,
      amount: true,
      category: true,
      date: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return expense;
};

// Get All expenses of a mess (members only) with optional filters
export const getExpenses = async ({ userId, messId, startDate, endDate, category }) => {
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

  const where = {
    messId,
  };

  if (startDate || endDate) {
    where.date = {};

    if (startDate) {
      const start = new Date(startDate);

      if (Number.isNaN(start.getTime())) {
        throw new AppError("Invalid start date", 400);
      }

      where.date.gte = start;
    }

    if (endDate) {
      const end = new Date(endDate);

      if (Number.isNaN(end.getTime())) {
        throw new AppError("Invalid end date", 400);
      }

      where.date.lte = end;
    }
  }

  if (category) {
    if (!VALID_CATEGORIES.includes(category)) {
      throw new AppError(`Invalid expense category. Valid categories: ${VALID_CATEGORIES.join(", ")}`, 400);
    }

    where.category = category;
  }

  const expenses = await prisma.expense.findMany({
    where,
    select: {
      id: true,
      messId: true,
      recordedBy: true,
      title: true,
      description: true,
      amount: true,
      category: true,
      date: true,
      createdAt: true,
      updatedAt: true,
      recorder: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  return expenses;
};

// Get single expense by ID
export const getExpenseById = async ({ userId, messId, expenseId }) => {
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

  const expense = await prisma.expense.findFirst({
    where: {
      id: expenseId,
      messId,
    },
    select: {
      id: true,
      messId: true,
      recordedBy: true,
      title: true,
      description: true,
      amount: true,
      category: true,
      date: true,
      createdAt: true,
      updatedAt: true,
      recorder: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!expense) {
    throw new AppError("Expense not found", 404);
  }

  return expense;
};

// Update an expense (recorder or manager only)
export const updateExpense = async ({ userId, messId, expenseId, title, description, amount, category, date }) => {
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
    throw new AppError("Only mess managers can update expenses", 403);
  }

  const existingExpense = await prisma.expense.findFirst({
    where: {
      id: expenseId,
      messId,
    },
  });

  if (!existingExpense) {
    throw new AppError("Expense not found", 404);
  }

  if (title !== undefined && title.trim().length === 0) {
    throw new AppError("Expense title cannot be empty", 400);
  }

  if (amount !== undefined && (typeof amount !== "number" || amount <= 0)) {
    throw new AppError("Expense amount must be a positive number", 400);
  }

  if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
    throw new AppError(`Invalid expense category. Valid categories: ${VALID_CATEGORIES.join(", ")}`, 400);
  }

  if (date !== undefined) {
    const expenseDate = new Date(date);

    if (Number.isNaN(expenseDate.getTime())) {
      throw new AppError("Invalid expense date", 400);
    }
  }

  const updateData = {};

  if (title !== undefined) updateData.title = title.trim();
  if (description !== undefined) updateData.description = description?.trim() || null;
  if (amount !== undefined) updateData.amount = amount;
  if (category !== undefined) updateData.category = category;
  if (date !== undefined) updateData.date = new Date(date);

  const updatedExpense = await prisma.expense.update({
    where: {
      id: expenseId,
    },
    data: updateData,
    select: {
      id: true,
      messId: true,
      recordedBy: true,
      title: true,
      description: true,
      amount: true,
      category: true,
      date: true,
      createdAt: true,
      updatedAt: true,
      recorder: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return updatedExpense;
};

// Delete an expense (manager only)
export const deleteExpense = async ({ userId, messId, expenseId }) => {
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
    throw new AppError("Only mess managers can delete expenses", 403);
  }

  const existingExpense = await prisma.expense.findFirst({
    where: {
      id: expenseId,
      messId,
    },
  });

  if (!existingExpense) {
    throw new AppError("Expense not found", 404);
  }

  await prisma.expense.delete({
    where: {
      id: expenseId,
    },
  });

  return { message: "Expense deleted successfully" };
};
