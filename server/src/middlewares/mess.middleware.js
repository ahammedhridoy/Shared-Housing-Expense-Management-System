import { requireMember } from "../utils/membership.js";

export const messManagerMiddleware = async (req, res, next) => {
  try {
    req.messMembership = await requireMember(req.user.userId, req.params.messId, { manager: true });
    next();
  } catch (error) {
    next(error);
  }
};
