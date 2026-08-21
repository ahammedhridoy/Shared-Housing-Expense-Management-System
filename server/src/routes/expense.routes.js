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
import validate from "../middlewares/validate.middleware.js";
import validateParams from "../middlewares/validateParams.middleware.js";
import validateQuery from "../middlewares/validateQuery.middleware.js";
import {
  addExpenseSchema,
  updateExpenseSchema,
  expenseQuerySchema,
  expenseMessIdParamSchema,
  expenseIdParamSchema,
} from "../validations/expense.validation.js";

const router = express.Router();

router.post(
  "/mess/:messId/expenses",
  authMiddleware,
  validateParams(expenseMessIdParamSchema),
  messManagerMiddleware,
  validate(addExpenseSchema),
  addExpenseController,
);

router.get(
  "/mess/:messId/expenses",
  authMiddleware,
  validateParams(expenseMessIdParamSchema),
  validateQuery(expenseQuerySchema),
  getExpensesController,
);

router.get(
  "/mess/:messId/expenses/:expenseId",
  authMiddleware,
  validateParams(expenseIdParamSchema),
  getExpenseByIdController,
);

router.put(
  "/mess/:messId/expenses/:expenseId",
  authMiddleware,
  validateParams(expenseIdParamSchema),
  messManagerMiddleware,
  validate(updateExpenseSchema),
  updateExpenseController,
);

router.delete(
  "/mess/:messId/expenses/:expenseId",
  authMiddleware,
  validateParams(expenseIdParamSchema),
  messManagerMiddleware,
  deleteExpenseController,
);

export default router;
