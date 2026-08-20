import {
  addPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
} from "../services/payment.service.js";
import AppError from "../utils/AppError.js";

// Add a payment
export const addPaymentController = async (req, res, next) => {
  try {
    const { messId } = req.params;

    const { payerId, amount, date, method, note } = req.body;

    if (!payerId) {
      throw new AppError("Payer ID is required", 400);
    }

    if (!amount) {
      throw new AppError("Payment amount is required", 400);
    }

    if (!date) {
      throw new AppError("Payment date is required", 400);
    }

    if (!method) {
      throw new AppError("Payment method is required", 400);
    }

    const payment = await addPayment({
      userId: req.user.userId,
      messId,
      payerId,
      amount: Number(amount),
      date,
      method,
      note,
    });

    res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all payments of a mess
export const getPaymentsController = async (req, res, next) => {
  try {
    const { messId } = req.params;

    const { startDate, endDate, method } = req.query;

    const payments = await getPayments({
      userId: req.user.userId,
      messId,
      startDate,
      endDate,
      method,
    });

    res.status(200).json({
      success: true,
      message: "Payments fetched successfully",
      data: {
        count: payments.length,
        payments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single payment by ID
export const getPaymentByIdController = async (req, res, next) => {
  try {
    const { messId, paymentId } = req.params;

    const payment = await getPaymentById({
      userId: req.user.userId,
      messId,
      paymentId,
    });

    res.status(200).json({
      success: true,
      message: "Payment fetched successfully",
      data: {
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update a payment
export const updatePaymentController = async (req, res, next) => {
  try {
    const { messId, paymentId } = req.params;

    const { payerId, amount, date, method, note } = req.body;

    const payment = await updatePayment({
      userId: req.user.userId,
      messId,
      paymentId,
      payerId,
      amount: amount !== undefined ? Number(amount) : undefined,
      date,
      method,
      note,
    });

    res.status(200).json({
      success: true,
      message: "Payment updated successfully",
      data: {
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete a payment
export const deletePaymentController = async (req, res, next) => {
  try {
    const { messId, paymentId } = req.params;

    const result = await deletePayment({
      userId: req.user.userId,
      messId,
      paymentId,
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
