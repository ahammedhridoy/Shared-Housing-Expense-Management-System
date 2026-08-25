import {
  addPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
} from "../services/payment.service.js";

export const addPaymentController = async (req, res, next) => {
  try {
    const { messId } = req.params;
    const { payerId, amount, date, note } = req.body;

    const payment = await addPayment({
      userId: req.user.userId,
      messId,
      payerId,
      amount,
      date,
      note,
      recordedBy: req.user.userId,
    });

    res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: { payment },
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentsController = async (req, res, next) => {
  try {
    const { messId } = req.params;
    const { startDate, endDate } = req.query;

    const payments = await getPayments({
      userId: req.user.userId,
      messId,
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      message: "Payments fetched successfully",
      data: { count: payments.length, payments },
    });
  } catch (error) {
    next(error);
  }
};

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
      data: { payment },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePaymentController = async (req, res, next) => {
  try {
    const { messId, paymentId } = req.params;
    const { payerId, amount, date, note } = req.body;

    const payment = await updatePayment({
      userId: req.user.userId,
      messId,
      paymentId,
      payerId,
      amount,
      date,
      note,
    });

    res.status(200).json({
      success: true,
      message: "Payment updated successfully",
      data: { payment },
    });
  } catch (error) {
    next(error);
  }
};

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
