import express from "express";
import {
  addDepositController,
  getDepositsController,
  updateDepositController,
  deleteDepositController,
} from "../controllers/deposit.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { messManagerMiddleware } from "../middlewares/mess.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import validateParams from "../middlewares/validateParams.middleware.js";
import validateQuery from "../middlewares/validateQuery.middleware.js";
import { messIdParamSchema } from "../validations/common.js";
import {
  addDepositSchema,
  updateDepositSchema,
  depositQuerySchema,
  depositIdParamSchema,
} from "../validations/deposit.validation.js";

const router = express.Router();

router.post(
  "/mess/:messId/deposits",
  authMiddleware,
  validateParams(messIdParamSchema),
  messManagerMiddleware,
  validate(addDepositSchema),
  addDepositController,
);

// GET /mess/:messId/deposits?month=11&year=2026
router.get(
  "/mess/:messId/deposits",
  authMiddleware,
  validateParams(messIdParamSchema),
  validateQuery(depositQuerySchema),
  getDepositsController,
);

router.put(
  "/mess/:messId/deposits/:depositId",
  authMiddleware,
  validateParams(depositIdParamSchema),
  messManagerMiddleware,
  validate(updateDepositSchema),
  updateDepositController,
);

router.delete(
  "/mess/:messId/deposits/:depositId",
  authMiddleware,
  validateParams(depositIdParamSchema),
  messManagerMiddleware,
  deleteDepositController,
);

export default router;
