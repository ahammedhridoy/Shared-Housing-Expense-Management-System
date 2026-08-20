import {
  finalizeMonth,
  getMonthlyBill,
  getMessBills,
} from "../services/monthlyBill.service.js";
import AppError from "../utils/AppError.js";

// Finalize a month
export const finalizeMonthController = async (req, res, next) => {
  try {
    const { messId } = req.params;

    const { month, year } = req.body;

    if (!month) {
      throw new AppError("Month is required", 400);
    }

    if (!year) {
      throw new AppError("Year is required", 400);
    }

    const result = await finalizeMonth({
      userId: req.user.userId,
      messId,
      month,
      year,
    });

    res.status(201).json({
      success: true,
      message: "Month finalized successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get monthly bill by month and year
export const getMonthlyBillController = async (req, res, next) => {
  try {
    const { messId } = req.params;

    const { month, year } = req.query;

    if (!month || !year) {
      throw new AppError("Month and year are required", 400);
    }

    const bill = await getMonthlyBill({
      userId: req.user.userId,
      messId,
      month,
      year,
    });

    res.status(200).json({
      success: true,
      message: "Bill fetched successfully",
      data: {
        bill,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all bills of a mess
export const getMessBillsController = async (req, res, next) => {
  try {
    const { messId } = req.params;

    const bills = await getMessBills({
      userId: req.user.userId,
      messId,
    });

    res.status(200).json({
      success: true,
      message: "Bills fetched successfully",
      data: {
        count: bills.length,
        bills,
      },
    });
  } catch (error) {
    next(error);
  }
};
