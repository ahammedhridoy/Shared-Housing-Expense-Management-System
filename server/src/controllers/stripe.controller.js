import {
  createCheckoutSession,
  retrieveCheckoutSession,
} from "../services/stripe.service.js";
import {
  addPayment,
  getPaymentByStripeCheckoutId,
} from "../services/payment.service.js";

/**
 * POST /mess/:messId/payments/checkout
 * Creates a Stripe Checkout Session and returns the URL.
 */
export const createCheckoutSessionController = async (req, res, next) => {
  try {
    const { messId } = req.params;
    const { amount, note } = req.body;
    const userId = req.user.userId;

    const { sessionId, url } = await createCheckoutSession({
      userId,
      messId,
      amount,
      note,
    });

    res.status(201).json({
      success: true,
      message: "Checkout session created",
      data: { sessionId, url },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /payments/verify
 * Verifies a Stripe Checkout Session and creates the Payment record.
 */
export const verifyPaymentController = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    const session = await retrieveCheckoutSession(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment was not completed",
        data: null,
      });
    }

    // Check if payment already recorded
    const existing = await getPaymentByStripeCheckoutId(sessionId);
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Payment already recorded",
        data: { payment: existing },
      });
    }

    // Create payment record
    const { userId, messId, amount, note } = session.metadata;

    const payment = await addPayment({
      userId,
      messId,
      payerId: userId,
      amount: parseFloat(amount),
      date: new Date().toISOString(),
      method: "STRIPE",
      note: note || null,
      stripeCheckoutId: sessionId,
      recordedBy: null,
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
