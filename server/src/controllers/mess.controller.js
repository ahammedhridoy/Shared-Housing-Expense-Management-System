import {
  createMess,
  getMyMesses,
  getMessDetails,
  getMessMembers,
  updateMess,
  updateMember,
  deleteMess,
  removeMessMember,
} from "../services/mess.service.js";
import { handle, send } from "../utils/respond.js";

export const createMessController = handle(async (req, res) => {
  const mess = await createMess({ userId: req.user.userId, ...req.body });
  send(res, 201, "Mess created successfully", { mess });
});

export const getMyMessesController = handle(async (req, res) => {
  const messes = await getMyMesses(req.user.userId);
  send(res, 200, "Messes fetched successfully", { messes });
});

export const getMessDetailsController = handle(async (req, res) => {
  const mess = await getMessDetails(req.user.userId, req.params.messId);
  send(res, 200, "Mess details fetched successfully", { mess });
});

export const getMessMembersController = handle(async (req, res) => {
  const members = await getMessMembers({
    userId: req.user.userId,
    messId: req.params.messId,
    includeFormer: req.query.includeFormer === "true",
  });
  send(res, 200, "Mess members fetched successfully", { members, count: members.length });
});

export const updateMessController = handle(async (req, res) => {
  const mess = await updateMess({ messId: req.params.messId, ...req.body });
  send(res, 200, "Mess updated successfully", { mess });
});

export const updateMemberController = handle(async (req, res) => {
  const member = await updateMember({ ...req.params, ...req.body });
  send(res, 200, "Member updated successfully", { member });
});

export const removeMessMemberController = handle(async (req, res) => {
  await removeMessMember({ ...req.params, managerId: req.user.userId });
  send(res, 200, "Member removed successfully");
});

export const deleteMessController = handle(async (req, res) => {
  await deleteMess({ messId: req.params.messId });
  send(res, 200, "Mess deleted successfully");
});
