import { addExpense, getExpenses, getExpenseById, updateExpense, deleteExpense } from "../services/expense.service.js";
import AppError from "../utils/AppError.js";

// Add an expense to a mess
export const addExpenseController = async (req, res, next) => {
  try {
    const { messId } = req.params;

    const { title, description, amount, category, date } = req.body;

    if (!title) {
      throw new AppError("Expense title is required", 400);
    }

    if (amount === undefined || amount === null) {
      throw new AppError("Expense amount is required", 400);
    }

    if (!category) {
      throw new AppError("Expense category is required", 400);
    }

    if (!date) {
      throw new AppError("Expense date is required", 400);
    }

    const expense = await addExpense({
      userId: req.user.userId,
      messId,
      title,
      description,
      amount: Number(amount),
      category,
      date,
    });

    res.status(201).json({
      success: true,
      message: "Expense added successfully",
      data: {
        expense,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all expenses of a mess with optional filters
export const getExpensesController = async (req, res, next) => {
  try {
    const { messId } = req.params;

    const { startDate, endDate, category } = req.query;

    const expenses = await getExpenses({
      userId: req.user.userId,
      messId,
      startDate,
      endDate,
      category,
    });

    res.status(200).json({
      success: true,
      message: "Expenses fetched successfully",
      data: {
        count: expenses.length,
        expenses,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single expense by ID
export const getExpenseByIdController = async (req, res, next) => {
  try {
    const { messId, expenseId } = req.params;

    const expense = await getExpenseById({
      userId: req.user.userId,
      messId,
      expenseId,
    });

    res.status(200).json({
      success: true,
      message: "Expense fetched successfully",
      data: {
        expense,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update an expense (recorder or manager only)
export const updateExpenseController = async (req, res, next) => {
  try {
    const { messId, expenseId } = req.params;

    const { title, description, amount, category, date } = req.body;

    const expense = await updateExpense({
      userId: req.user.userId,
      messId,
      expenseId,
      title,
      description,
      amount: amount !== undefined ? Number(amount) : undefined,
      category,
      date,
    });

    res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      data: {
        expense,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete an expense (manager only)
export const deleteExpenseController = async (req, res, next) => {
  try {
    const { messId, expenseId } = req.params;

    const result = await deleteExpense({
      userId: req.user.userId,
      messId,
      expenseId,
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
