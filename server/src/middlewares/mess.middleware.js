import prisma from "../config/database.js";
import AppError from "../utils/AppError.js";

export const messManagerMiddleware = async (req, res, next) => {
  try {
    const { messId } = req.params;
    const userId = req.user.userId;

    const membership = await prisma.messMember.findUnique({
      where: {
        userId_messId: {
          userId,
          messId,
        },
      },
      select: {
        id: true,
        role: true,
        userId: true,
        messId: true,
      },
    });

    if (!membership) {
      throw new AppError("You are not a member of this mess", 403);
    }

    if (membership.role !== "MANAGER") {
      throw new AppError("Only mess managers can perform this action", 403);
    }

    req.messMembership = membership;

    next();
  } catch (error) {
    next(error);
  }
};
