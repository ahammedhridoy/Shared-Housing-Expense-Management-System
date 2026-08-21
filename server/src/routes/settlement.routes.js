import express from "express";

import {
  getSettlementsByBillController,
  getMySettlementsController,
  recordSettlementPaymentController,
} from "../controllers/settlement.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import validateParams from "../middlewares/validateParams.middleware.js";
import {
  recordSettlementPaymentSchema,
  settlementMessIdParamSchema,
  settlementBillIdParamSchema,
  settlementIdParamSchema,
} from "../validations/settlement.validation.js";

const router = express.Router();

router.get(
  "/mess/:messId/settlements/my",
  authMiddleware,
  validateParams(settlementMessIdParamSchema),
  getMySettlementsController,
);

router.get(
  "/mess/:messId/settlements/bill/:billId",
  authMiddleware,
  validateParams(settlementBillIdParamSchema),
  getSettlementsByBillController,
);

router.post(
  "/mess/:messId/settlements/:settlementId/pay",
  authMiddleware,
  validateParams(settlementIdParamSchema),
  validate(recordSettlementPaymentSchema),
  recordSettlementPaymentController,
);

export default router;
