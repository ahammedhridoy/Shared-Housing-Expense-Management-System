import express from "express";

import {
  createInvitationController,
  acceptInvitationController,
} from "../controllers/invitation.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";
import { messManagerMiddleware } from "../middlewares/mess.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import validateParams from "../middlewares/validateParams.middleware.js";
import {
  createInvitationSchema,
  invitationMessIdParamSchema,
  acceptInvitationParamSchema,
} from "../validations/invitation.validation.js";

const router = express.Router();

router.post(
  "/mess/:messId/invitations",
  authMiddleware,
  validateParams(invitationMessIdParamSchema),
  messManagerMiddleware,
  validate(createInvitationSchema),
  createInvitationController,
);

router.post(
  "/:token/accept",
  authMiddleware,
  validateParams(acceptInvitationParamSchema),
  acceptInvitationController,
);

export default router;
