import express from "express";

import { addMealController } from "../controllers/meal.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/mess/:messId/meals", authMiddleware, addMealController);

export default router;
