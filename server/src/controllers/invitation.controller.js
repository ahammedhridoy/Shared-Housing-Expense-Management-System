import {
  createInvitation,
  acceptInvitation,
} from "../services/invitation.service.js";

// Create an invitation
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

// Accept an invitation
export const acceptInvitationController = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      const error = new Error("Invitation token is required");
      error.statusCode = 400;
      throw error;
    }

    const membership = await acceptInvitation({
      token,
      userId: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: "Invitation accepted successfully",
      data: {
        membership,
      },
    });
  } catch (error) {
    next(error);
  }
};
