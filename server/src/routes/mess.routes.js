import express from "express";
import {
  createMessController,
  getMessDetailsController,
  getMessMembersController,
  getMyMessesController,
  removeMessMemberController,
  updateMessController,
  updateMemberController,
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
  updateMemberSchema,
} from "../validations/mess.validation.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", validate(createMessSchema), createMessController);
router.get("/my", getMyMessesController);

router.get("/:messId", validateParams(messIdParamSchema), getMessDetailsController);
router.get("/:messId/members", validateParams(messIdParamSchema), getMessMembersController);

router.patch(
  "/:messId",
  validateParams(messIdParamSchema),
  messManagerMiddleware,
  validate(updateMessSchema),
  updateMessController,
);

router.patch(
  "/:messId/members/:userId",
  validateParams(messMemberParamSchema),
  messManagerMiddleware,
  validate(updateMemberSchema),
  updateMemberController,
);

router.delete(
  "/:messId/members/:userId",
  validateParams(messMemberParamSchema),
  messManagerMiddleware,
  removeMessMemberController,
);

router.delete("/:messId", validateParams(messIdParamSchema), messManagerMiddleware, deleteMessController);

export default router;
