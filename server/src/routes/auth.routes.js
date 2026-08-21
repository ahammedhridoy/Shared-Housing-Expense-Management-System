import express from "express";
import {
  getCurrentUser,
  login,
  logout,
  refresh,
  register,
} from "../controllers/auth.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { registerSchema, loginSchema } from "../validations/auth.validation.js";

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", authMiddleware, getCurrentUser);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
