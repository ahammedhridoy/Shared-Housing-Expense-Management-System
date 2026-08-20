import {
  getSettlementsByBill,
  getMySettlements,
  recordSettlementPayment,
} from "../services/settlement.service.js";
import AppError from "../utils/AppError.js";

// Get settlements by bill ID
export const getSettlementsByBillController = async (req, res, next) => {
  try {
    const { messId, billId } = req.params;

    const settlements = await getSettlementsByBill({
      userId: req.user.userId,
      messId,
      billId,
    });

    res.status(200).json({
      success: true,
      message: "Settlements fetched successfully",
      data: {
        count: settlements.length,
        settlements,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get logged-in user's settlements
export const getMySettlementsController = async (req, res, next) => {
  try {
    const { messId } = req.params;

    const settlements = await getMySettlements({
      userId: req.user.userId,
      messId,
    });

    res.status(200).json({
      success: true,
      message: "Your settlements fetched successfully",
      data: {
        count: settlements.length,
        settlements,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Record a payment against a settlement
export const recordSettlementPaymentController = async (req, res, next) => {
  try {
    const { messId, settlementId } = req.params;

    const { amount } = req.body;

    if (!amount) {
      throw new AppError("Payment amount is required", 400);
    }

    const settlement = await recordSettlementPayment({
      userId: req.user.userId,
      messId,
      settlementId,
      amount: Number(amount),
    });

    res.status(200).json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        settlement,
      },
    });
  } catch (error) {
    next(error);
  }
};
