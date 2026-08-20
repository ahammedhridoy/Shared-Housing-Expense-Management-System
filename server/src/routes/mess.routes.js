import express from "express";
import {
  createMessController,
  getMessDetailsController,
  getMyMessesController,
  removeMessMemberController,
} from "../controllers/mess.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { messManagerMiddleware } from "../middlewares/mess.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, createMessController);

router.get("/", authMiddleware, getMyMessesController);

router.get("/:messId", authMiddleware, getMessDetailsController);

router.delete(
  "/:messId/members/:userId",
  authMiddleware,
  messManagerMiddleware,
  removeMessMemberController,
);

export default router;
