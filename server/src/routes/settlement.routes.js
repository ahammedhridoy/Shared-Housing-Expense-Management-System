import express from "express";

import {
  getSettlementsByBillController,
  getMySettlementsController,
  recordSettlementPaymentController,
} from "../controllers/settlement.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/mess/:messId/settlements/my",
  authMiddleware,
  getMySettlementsController,
);

router.get(
  "/mess/:messId/settlements/bill/:billId",
  authMiddleware,
  getSettlementsByBillController,
);

router.post(
  "/mess/:messId/settlements/:settlementId/pay",
  authMiddleware,
  recordSettlementPaymentController,
);

export default router;
