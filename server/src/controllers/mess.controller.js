import {
  createMess,
  getMyMesses,
  getMessDetails,
  getMessMembers,
  updateMess,
  deleteMess,
  removeMessMember,
} from "../services/mess.service.js";

export const createMessController = async (req, res, next) => {
  try {
    const { name, description, address } = req.body;

    const mess = await createMess({
      userId: req.user.userId,
      name,
      description,
      address,
    });

    res.status(201).json({
      success: true,
      message: "Mess created successfully",
      data: { mess },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyMessesController = async (req, res, next) => {
  try {
    const messes = await getMyMesses(req.user.userId);

    res.status(200).json({
      success: true,
      message: "Messes fetched successfully",
      data: { messes },
    });
  } catch (error) {
    next(error);
  }
};

export const getMessDetailsController = async (req, res, next) => {
  try {
    const { messId } = req.params;

    const mess = await getMessDetails(req.user.userId, messId);

    res.status(200).json({
      success: true,
      message: "Mess details fetched successfully",
      data: { mess },
    });
  } catch (error) {
    next(error);
  }
};

export const getMessMembersController = async (req, res, next) => {
  try {
    const { messId } = req.params;

    const members = await getMessMembers({
      userId: req.user.userId,
      messId,
    });

    res.status(200).json({
      success: true,
      message: "Mess members fetched successfully",
      data: { members, count: members.length },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMessController = async (req, res, next) => {
  try {
    const { messId } = req.params;
    const { name, description, address } = req.body;

    const mess = await updateMess({ messId, name, description, address });

    res.status(200).json({
      success: true,
      message: "Mess updated successfully",
      data: { mess },
    });
  } catch (error) {
    next(error);
  }
};

export const removeMessMemberController = async (req, res, next) => {
  try {
    const { messId, userId } = req.params;

    await removeMessMember({
      messId,
      userId,
      managerId: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMessController = async (req, res, next) => {
  try {
    const { messId } = req.params;

    await deleteMess({
      messId,
      userId: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: "Mess deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
