import {
  finalizeMonth,
  getMonthlyBill,
  getMessBills,
} from "../services/monthlyBill.service.js";

export const finalizeMonthController = async (req, res, next) => {
  try {
    const { messId } = req.params;
    const { month, year } = req.body;

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

export const getMonthlyBillController = async (req, res, next) => {
  try {
    const { messId, month, year } = req.params;

    const bill = await getMonthlyBill({
      userId: req.user.userId,
      messId,
      month: Number(month),
      year: Number(year),
    });

    res.status(200).json({
      success: true,
      message: "Bill fetched successfully",
      data: { bill },
    });
  } catch (error) {
    next(error);
  }
};

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
      data: { count: bills.length, bills },
    });
  } catch (error) {
    next(error);
  }
};
