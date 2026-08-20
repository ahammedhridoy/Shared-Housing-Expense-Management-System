import express from "express";

import {
  addPaymentController,
  getPaymentsController,
  getPaymentByIdController,
  updatePaymentController,
  deletePaymentController,
} from "../controllers/payment.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";
import { messManagerMiddleware } from "../middlewares/mess.middleware.js";

const router = express.Router();

router.post(
  "/mess/:messId/payments",
  authMiddleware,
  messManagerMiddleware,
  addPaymentController,
);

router.get(
  "/mess/:messId/payments",
  authMiddleware,
  getPaymentsController,
);

router.get(
  "/mess/:messId/payments/:paymentId",
  authMiddleware,
  getPaymentByIdController,
);

router.put(
  "/mess/:messId/payments/:paymentId",
  authMiddleware,
  messManagerMiddleware,
  updatePaymentController,
);

router.delete(
  "/mess/:messId/payments/:paymentId",
  authMiddleware,
  messManagerMiddleware,
  deletePaymentController,
);

export default router;
