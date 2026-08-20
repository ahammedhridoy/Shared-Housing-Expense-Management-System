import { createInvitation } from "../services/invitation.service.js";

export const createInvitationController = async (req, res, next) => {
  try {
    const { messId } = req.params;
    const { email } = req.body;

    if (!email) {
      const error = new Error("Email is required");
      error.statusCode = 400;
      throw error;
    }

    const invitation = await createInvitation({
      messId,
      invitedBy: req.user.userId,
      email,
    });

    res.status(201).json({
      success: true,
      message: "Invitation created successfully",
      data: {
        invitation,
      },
    });
  } catch (error) {
    next(error);
  }
};
