import express from "express";
import {
  getMonthSummaryController,
  closeMonthController,
  reopenMonthController,
  listClosedMonthsController,
} from "../controllers/month.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { messManagerMiddleware } from "../middlewares/mess.middleware.js";
import validateParams from "../middlewares/validateParams.middleware.js";
import { messIdParamSchema, monthParamSchema } from "../validations/common.js";

const router = express.Router();

// Closed months (history)
router.get("/mess/:messId/months", authMiddleware, validateParams(messIdParamSchema), listClosedMonthsController);

// Full calculation of one month (live if open, frozen if closed)
router.get(
  "/mess/:messId/months/:year/:month",
  authMiddleware,
  validateParams(monthParamSchema),
  getMonthSummaryController,
);

router.post(
  "/mess/:messId/months/:year/:month/close",
  authMiddleware,
  validateParams(monthParamSchema),
  messManagerMiddleware,
  closeMonthController,
);

router.post(
  "/mess/:messId/months/:year/:month/reopen",
  authMiddleware,
  validateParams(monthParamSchema),
  messManagerMiddleware,
  reopenMonthController,
);

export default router;
