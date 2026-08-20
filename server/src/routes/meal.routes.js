import express from "express";

import {
  addMealController,
  getMyMealsController,
  getMessMealsController,
  updateMealController,
  deleteMealController,
} from "../controllers/meal.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/mess/:messId/meals", authMiddleware, addMealController);
router.get("/mess/:messId/meals", authMiddleware, getMyMealsController);
router.get("/mess/:messId/meals/all", authMiddleware, getMessMealsController);
router.put("/mess/:messId/meals/:mealId", authMiddleware, updateMealController);
router.delete("/mess/:messId/meals/:mealId", authMiddleware, deleteMealController);

export default router;
