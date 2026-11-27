import { addExpense, getExpenses, updateExpense, deleteExpense } from "../services/expense.service.js";
import { handle, send } from "../utils/respond.js";

export const addExpenseController = handle(async (req, res) => {
  const expense = await addExpense({ userId: req.user.userId, messId: req.params.messId, ...req.body });
  send(res, 201, "Expense added successfully", { expense });
});

export const getExpensesController = handle(async (req, res) => {
  const expenses = await getExpenses({ userId: req.user.userId, messId: req.params.messId, ...req.query });
  send(res, 200, "Expenses fetched successfully", { count: expenses.length, expenses });
});

export const updateExpenseController = handle(async (req, res) => {
  const expense = await updateExpense({ userId: req.user.userId, ...req.params, ...req.body });
  send(res, 200, "Expense updated successfully", { expense });
});

export const deleteExpenseController = handle(async (req, res) => {
  await deleteExpense({ userId: req.user.userId, ...req.params });
  send(res, 200, "Expense deleted successfully");
});
