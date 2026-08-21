import express from "express";

import {
  createInvitationController,
  getPendingInvitationsController,
  getMessInvitationsController,
  acceptInvitationController,
  cancelInvitationController,
} from "../controllers/invitation.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";
import { messManagerMiddleware } from "../middlewares/mess.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import validateParams from "../middlewares/validateParams.middleware.js";
import {
  createInvitationSchema,
  invitationMessIdParamSchema,
  invitationIdParamSchema,
} from "../validations/invitation.validation.js";

const router = express.Router();

// User sees their pending invitations
router.get(
  "/pending",
  authMiddleware,
  getPendingInvitationsController,
);

// Manager sees all invitations for their mess
router.get(
  "/mess/:messId",
  authMiddleware,
  validateParams(invitationMessIdParamSchema),
  messManagerMiddleware,
  getMessInvitationsController,
);

// Manager sends invitation
router.post(
  "/mess/:messId",
  authMiddleware,
  validateParams(invitationMessIdParamSchema),
  messManagerMiddleware,
  validate(createInvitationSchema),
  createInvitationController,
);

// User accepts invitation
router.post(
  "/:invitationId/accept",
  authMiddleware,
  validateParams(invitationIdParamSchema),
  acceptInvitationController,
);

// Manager or inviter cancels invitation
router.delete(
  "/:invitationId/cancel",
  authMiddleware,
  validateParams(invitationIdParamSchema),
  cancelInvitationController,
);

export default router;
