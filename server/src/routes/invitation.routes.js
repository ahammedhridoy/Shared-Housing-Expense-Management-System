import express from "express";

import {
  createInvitationController,
  acceptInvitationController,
} from "../controllers/invitation.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";
import { messManagerMiddleware } from "../middlewares/mess.middleware.js";

const router = express.Router();

router.post(
  "/mess/:messId/invitations",
  authMiddleware,
  messManagerMiddleware,
  createInvitationController,
);

router.post("/:token/accept", authMiddleware, acceptInvitationController);

export default router;
