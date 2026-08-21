import express from "express";

import {
  addMealController,
  getMyMealsController,
  getMessMealsController,
  updateMealController,
  deleteMealController,
} from "../controllers/meal.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import validateParams from "../middlewares/validateParams.middleware.js";
import validateQuery from "../middlewares/validateQuery.middleware.js";
import {
  addMealSchema,
  updateMealSchema,
  mealQuerySchema,
  mealMessIdParamSchema,
  mealIdParamSchema,
} from "../validations/meal.validation.js";

const router = express.Router();

router.post(
  "/mess/:messId/meals",
  authMiddleware,
  validateParams(mealMessIdParamSchema),
  validate(addMealSchema),
  addMealController,
);

router.get(
  "/mess/:messId/meals",
  authMiddleware,
  validateParams(mealMessIdParamSchema),
  validateQuery(mealQuerySchema),
  getMyMealsController,
);

router.get(
  "/mess/:messId/meals/all",
  authMiddleware,
  validateParams(mealMessIdParamSchema),
  validateQuery(mealQuerySchema),
  getMessMealsController,
);

router.put(
  "/mess/:messId/meals/:mealId",
  authMiddleware,
  validateParams(mealIdParamSchema),
  validate(updateMealSchema),
  updateMealController,
);

router.delete(
  "/mess/:messId/meals/:mealId",
  authMiddleware,
  validateParams(mealIdParamSchema),
  deleteMealController,
);

export default router;
