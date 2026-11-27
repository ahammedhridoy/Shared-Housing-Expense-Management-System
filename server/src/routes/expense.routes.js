import express from "express";
import {
  addExpenseController,
  getExpensesController,
  updateExpenseController,
  deleteExpenseController,
} from "../controllers/expense.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { messManagerMiddleware } from "../middlewares/mess.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import validateParams from "../middlewares/validateParams.middleware.js";
import validateQuery from "../middlewares/validateQuery.middleware.js";
import { messIdParamSchema } from "../validations/common.js";
import {
  addExpenseSchema,
  updateExpenseSchema,
  expenseQuerySchema,
  expenseIdParamSchema,
} from "../validations/expense.validation.js";

const router = express.Router();

router.post(
  "/mess/:messId/expenses",
  authMiddleware,
  validateParams(messIdParamSchema),
  messManagerMiddleware,
  validate(addExpenseSchema),
  addExpenseController,
);

// GET /mess/:messId/expenses?month=11&year=2026&kind=MEAL
router.get(
  "/mess/:messId/expenses",
  authMiddleware,
  validateParams(messIdParamSchema),
  validateQuery(expenseQuerySchema),
  getExpensesController,
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
