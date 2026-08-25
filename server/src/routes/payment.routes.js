import express from "express";

import {
  addPaymentController,
  getPaymentsController,
  getPaymentByIdController,
  updatePaymentController,
  deletePaymentController,
} from "../controllers/payment.controller.js";

import {
  createCheckoutSessionController,
  verifyPaymentController,
} from "../controllers/stripe.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";
import { messManagerMiddleware } from "../middlewares/mess.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import validateParams from "../middlewares/validateParams.middleware.js";
import validateQuery from "../middlewares/validateQuery.middleware.js";
import {
  addPaymentSchema,
  updatePaymentSchema,
  checkoutSessionSchema,
  verifyPaymentSchema,
  paymentQuerySchema,
  paymentMessIdParamSchema,
  paymentIdParamSchema,
} from "../validations/payment.validation.js";

const router = express.Router();

// Stripe checkout (any member can pay)
router.post(
  "/mess/:messId/payments/checkout",
  authMiddleware,
  validateParams(paymentMessIdParamSchema),
  validate(checkoutSessionSchema),
  createCheckoutSessionController,
);

// Verify Stripe payment (any member)
router.post(
  "/payments/verify",
  authMiddleware,
  validate(verifyPaymentSchema),
  verifyPaymentController,
);

// Manual payment record (manager only)
router.post(
  "/mess/:messId/payments",
  authMiddleware,
  validateParams(paymentMessIdParamSchema),
  messManagerMiddleware,
  validate(addPaymentSchema),
  addPaymentController,
);

router.get(
  "/mess/:messId/payments",
  authMiddleware,
  validateParams(paymentMessIdParamSchema),
  validateQuery(paymentQuerySchema),
  getPaymentsController,
);

router.get(
  "/mess/:messId/payments/:paymentId",
  authMiddleware,
  validateParams(paymentIdParamSchema),
  getPaymentByIdController,
);

router.put(
  "/mess/:messId/payments/:paymentId",
  authMiddleware,
  validateParams(paymentIdParamSchema),
  messManagerMiddleware,
  validate(updatePaymentSchema),
  updatePaymentController,
);

router.delete(
  "/mess/:messId/payments/:paymentId",
  authMiddleware,
  validateParams(paymentIdParamSchema),
  messManagerMiddleware,
  deletePaymentController,
);

export default router;
