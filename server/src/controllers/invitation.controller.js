import {
  createInvitation,
  getPendingInvitations,
  getMessInvitations,
  acceptInvitation,
  cancelInvitation,
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
      data: { invitation },
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingInvitationsController = async (req, res, next) => {
  try {
    const invitations = await getPendingInvitations(req.user.userId);

    res.status(200).json({
      success: true,
      message: "Pending invitations fetched successfully",
      data: { invitations },
    });
  } catch (error) {
    next(error);
  }
};

export const getMessInvitationsController = async (req, res, next) => {
  try {
    const { messId } = req.params;

    const invitations = await getMessInvitations({
      messId,
      userId: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: "Mess invitations fetched successfully",
      data: { invitations },
    });
  } catch (error) {
    next(error);
  }
};

export const acceptInvitationController = async (req, res, next) => {
  try {
    const { invitationId } = req.params;

    const membership = await acceptInvitation({
      invitationId,
      userId: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: "Invitation accepted successfully",
      data: { membership },
    });
  } catch (error) {
    next(error);
  }
};

export const cancelInvitationController = async (req, res, next) => {
  try {
    const { invitationId } = req.params;

    const result = await cancelInvitation({
      invitationId,
      userId: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
