import express from "express";

import {
  finalizeMonthController,
  getMonthlyBillController,
  getMessBillsController,
} from "../controllers/monthlyBill.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";
import { messManagerMiddleware } from "../middlewares/mess.middleware.js";

const router = express.Router();

router.post(
  "/mess/:messId/bills/finalize",
  authMiddleware,
  messManagerMiddleware,
  finalizeMonthController,
);

router.get(
  "/mess/:messId/bills",
  authMiddleware,
  getMessBillsController,
);

router.get(
  "/mess/:messId/bills/:month/:year",
  authMiddleware,
  getMonthlyBillController,
);

export default router;
