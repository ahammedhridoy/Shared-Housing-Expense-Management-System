import {
  createMess,
  getMyMesses,
  getMessDetails,
  updateMess,
  removeMessMember,
} from "../services/mess.service.js";

// Controller function to create a new mess
export const createMessController = async (req, res, next) => {
  try {
    const { name, description, address } = req.body;

    if (!name) {
      const error = new Error("Mess name is required");
      error.statusCode = 400;
      throw error;
    }

    const mess = await createMess({
      userId: req.user.userId,
      name,
      description,
      address,
    });

    res.status(201).json({
      success: true,
      message: "Mess created successfully",
      data: {
        mess,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Controller function to get all messes for a user
export const getMyMessesController = async (req, res, next) => {
  try {
    const messes = await getMyMesses(req.user.userId);

    res.status(200).json({
      success: true,
      message: "Messes fetched successfully",
      data: {
        messes,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Controller function to get mess details for a user
export const getMessDetailsController = async (req, res, next) => {
  try {
    const { messId } = req.params;

    if (!messId) {
      const error = new Error("Mess ID is required");
      error.statusCode = 400;
      throw error;
    }

    const mess = await getMessDetails(req.user.userId, messId);

    res.status(200).json({
      success: true,
      message: "Mess details fetched successfully",
      data: {
        mess,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Controller function to update mess details for a user
export const updateMessController = async (req, res, next) => {
  try {
    const { messId } = req.params;

    const { name, description, address } = req.body;

    const mess = await updateMess({
      messId,
      name,
      description,
      address,
    });

    res.status(200).json({
      success: true,
      message: "Mess updated successfully",
      data: {
        mess,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Controller function to remove a mess member
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
