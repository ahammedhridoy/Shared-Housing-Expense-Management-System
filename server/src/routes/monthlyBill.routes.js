import express from "express";

import {
  finalizeMonthController,
  getMonthlyBillController,
  getMessBillsController,
} from "../controllers/monthlyBill.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";
import { messManagerMiddleware } from "../middlewares/mess.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import validateParams from "../middlewares/validateParams.middleware.js";
import {
  finalizeMonthSchema,
  monthlyBillParamSchema,
  monthlyBillMessIdParamSchema,
} from "../validations/monthlyBill.validation.js";

const router = express.Router();

router.post(
  "/mess/:messId/bills/finalize",
  authMiddleware,
  validateParams(monthlyBillMessIdParamSchema),
  messManagerMiddleware,
  validate(finalizeMonthSchema),
  finalizeMonthController,
);

router.get(
  "/mess/:messId/bills",
  authMiddleware,
  validateParams(monthlyBillMessIdParamSchema),
  getMessBillsController,
);

router.get(
  "/mess/:messId/bills/:month/:year",
  authMiddleware,
  validateParams(monthlyBillParamSchema),
  getMonthlyBillController,
);

export default router;
