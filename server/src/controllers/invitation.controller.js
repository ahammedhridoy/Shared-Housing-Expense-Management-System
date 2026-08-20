import {
  createInvitation,
  acceptInvitation,
} from "../services/invitation.service.js";
import AppError from "../utils/AppError.js";

// Create an invitation
export const createInvitationController = async (req, res, next) => {
  try {
    const { messId } = req.params;
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400);
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
      throw new AppError("Invitation token is required", 400);
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
