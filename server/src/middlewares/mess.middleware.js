import prisma from "../config/database.js";

export const messManagerMiddleware = async (req, res, next) => {
  try {
    const { messId } = req.params;
    const userId = req.user.userId;

    if (!messId) {
      const error = new Error("Mess ID is required");
      error.statusCode = 400;
      throw error;
    }

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
      const error = new Error("You are not a member of this mess");
      error.statusCode = 403;
      throw error;
    }

    if (membership.role !== "MANAGER") {
      const error = new Error("Only mess managers can perform this action");
      error.statusCode = 403;
      throw error;
    }

    req.messMembership = membership;

    next();
  } catch (error) {
    next(error);
  }
};
