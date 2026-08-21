import {
  createInvitation,
  acceptInvitation,
} from "../services/invitation.service.js";

export const createInvitationController = async (req, res, next) => {
  try {
    const { messId } = req.params;
    const { email } = req.body;

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

export const acceptInvitationController = async (req, res, next) => {
  try {
    const { token } = req.params;

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
