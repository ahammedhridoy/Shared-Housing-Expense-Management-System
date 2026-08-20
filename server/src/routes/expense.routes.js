import express from "express";

import {
  addExpenseController,
  getExpensesController,
  getExpenseByIdController,
  updateExpenseController,
  deleteExpenseController,
} from "../controllers/expense.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";
import { messManagerMiddleware } from "../middlewares/mess.middleware.js";

const router = express.Router();

router.post(
  "/mess/:messId/expenses",
  authMiddleware,
  messManagerMiddleware,
  addExpenseController,
);

router.get(
  "/mess/:messId/expenses",
  authMiddleware,
  getExpensesController,
);

router.get(
  "/mess/:messId/expenses/:expenseId",
  authMiddleware,
  getExpenseByIdController,
);

router.put(
  "/mess/:messId/expenses/:expenseId",
  authMiddleware,
  messManagerMiddleware,
  updateExpenseController,
);

router.delete(
  "/mess/:messId/expenses/:expenseId",
  authMiddleware,
  messManagerMiddleware,
  deleteExpenseController,
);

export default router;
