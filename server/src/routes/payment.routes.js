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
import validate from "../middlewares/validate.middleware.js";
import validateParams from "../middlewares/validateParams.middleware.js";
import validateQuery from "../middlewares/validateQuery.middleware.js";
import {
  addPaymentSchema,
  updatePaymentSchema,
  paymentQuerySchema,
  paymentMessIdParamSchema,
  paymentIdParamSchema,
} from "../validations/payment.validation.js";

const router = express.Router();

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
