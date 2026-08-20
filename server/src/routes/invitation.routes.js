import express from "express";

import { createInvitationController } from "../controllers/invitation.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";
import { messManagerMiddleware } from "../middlewares/mess.middleware.js";

const router = express.Router();

router.post(
  "/mess/:messId/invitations",
  authMiddleware,
  messManagerMiddleware,
  createInvitationController,
);

export default router;
