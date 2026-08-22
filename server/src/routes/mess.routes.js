import express from "express";
import {
  createMessController,
  getMessDetailsController,
  getMessMembersController,
  getMyMessesController,
  removeMessMemberController,
  updateMessController,
  deleteMessController,
} from "../controllers/mess.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { messManagerMiddleware } from "../middlewares/mess.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import validateParams from "../middlewares/validateParams.middleware.js";
import {
  createMessSchema,
  updateMessSchema,
  messIdParamSchema,
  messMemberParamSchema,
} from "../validations/mess.validation.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  validate(createMessSchema),
  createMessController,
);

router.get("/my", authMiddleware, getMyMessesController);

router.get(
  "/:messId",
  authMiddleware,
  validateParams(messIdParamSchema),
  getMessDetailsController,
);

router.get(
  "/:messId/members",
  authMiddleware,
  validateParams(messIdParamSchema),
  getMessMembersController,
);

router.patch(
  "/:messId",
  authMiddleware,
  validateParams(messIdParamSchema),
  validate(updateMessSchema),
  updateMessController,
);

router.delete(
  "/:messId/members/:userId",
  authMiddleware,
  validateParams(messMemberParamSchema),
  messManagerMiddleware,
  removeMessMemberController,
);

router.delete(
  "/:messId",
  authMiddleware,
  validateParams(messIdParamSchema),
  messManagerMiddleware,
  deleteMessController,
);

export default router;
