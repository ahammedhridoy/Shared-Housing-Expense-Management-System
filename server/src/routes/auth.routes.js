import express from "express";
import {
  getCurrentUser,
  login,
  logout,
  refresh,
  register,
} from "../controllers/auth.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, getCurrentUser);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
