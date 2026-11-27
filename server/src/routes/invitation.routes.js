import express from "express";

import {
  createInvitationController,
  getPendingInvitationsController,
  getMessInvitationsController,
  acceptInvitationController,
  cancelInvitationController,
  rejectInvitationController,
  getInvitationByTokenController,
} from "../controllers/invitation.controller.js";

import authMiddleware from "../middlewares/auth.middleware.js";
import { messManagerMiddleware } from "../middlewares/mess.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import validateParams from "../middlewares/validateParams.middleware.js";
import {
  createInvitationSchema,
  invitationMessIdParamSchema,
  invitationIdParamSchema,
  invitationTokenParamSchema,
} from "../validations/invitation.validation.js";

const router = express.Router();

// Public: preview an invitation from its link (no login needed)
router.get(
  "/token/:token",
  validateParams(invitationTokenParamSchema),
  getInvitationByTokenController,
);

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

// User rejects invitation
router.post(
  "/:invitationId/reject",
  authMiddleware,
  validateParams(invitationIdParamSchema),
  rejectInvitationController,
);

// Manager or inviter cancels invitation
router.delete(
  "/:invitationId/cancel",
  authMiddleware,
  validateParams(invitationIdParamSchema),
  cancelInvitationController,
);

export default router;
