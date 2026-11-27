import express from "express";
import { getMonthMealsController, setMealsController } from "../controllers/meal.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { messManagerMiddleware } from "../middlewares/mess.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import validateParams from "../middlewares/validateParams.middleware.js";
import validateQuery from "../middlewares/validateQuery.middleware.js";
import { messIdParamSchema, monthQuerySchema } from "../validations/common.js";
import { setMealsSchema } from "../validations/meal.validation.js";

const router = express.Router();

// GET /mess/:messId/meals?month=11&year=2026
router.get(
  "/mess/:messId/meals",
  authMiddleware,
  validateParams(messIdParamSchema),
  validateQuery(monthQuerySchema),
  getMonthMealsController,
);

// PUT /mess/:messId/meals  { entries: [{ userId, date: "YYYY-MM-DD", count }] }
router.put(
  "/mess/:messId/meals",
  authMiddleware,
  validateParams(messIdParamSchema),
  messManagerMiddleware,
  validate(setMealsSchema),
  setMealsController,
);

export default router;
