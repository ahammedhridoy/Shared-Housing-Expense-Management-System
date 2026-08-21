import express from "express";

import {
  addMealController,
  getMyMealsController,
  getMessMealsController,
  updateMealController,
  deleteMealController,
} from "../controllers/meal.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";
import { messManagerMiddleware } from "../middlewares/mess.middleware.js";
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

// Manager adds meal for a user
router.post(
  "/mess/:messId/meals",
  authMiddleware,
  validateParams(mealMessIdParamSchema),
  messManagerMiddleware,
  validate(addMealSchema),
  addMealController,
);

// Get all mess meals (must be before /mess/:messId/meals)
router.get(
  "/mess/:messId/meals/all",
  authMiddleware,
  validateParams(mealMessIdParamSchema),
  validateQuery(mealQuerySchema),
  getMessMealsController,
);

// User gets their own meals
router.get(
  "/mess/:messId/meals",
  authMiddleware,
  validateParams(mealMessIdParamSchema),
  validateQuery(mealQuerySchema),
  getMyMealsController,
);

// Manager updates a meal
router.put(
  "/mess/:messId/meals/:mealId",
  authMiddleware,
  validateParams(mealIdParamSchema),
  messManagerMiddleware,
  validate(updateMealSchema),
  updateMealController,
);

// Manager deletes a meal
router.delete(
  "/mess/:messId/meals/:mealId",
  authMiddleware,
  validateParams(mealIdParamSchema),
  messManagerMiddleware,
  deleteMealController,
);

export default router;
