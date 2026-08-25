import Stripe from "stripe";
import AppError from "../utils/AppError.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

/**
 * Create a Stripe Checkout Session for a mess payment.
 * Returns { sessionId, url } so the client can redirect.
 */
export const createCheckoutSession = async ({ userId, messId, amount, note }) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new AppError("Stripe is not configured. Add STRIPE_SECRET_KEY to .env", 500);
  }

  if (!amount || typeof amount !== "number" || amount <= 0) {
    throw new AppError("Payment amount must be a positive number", 400);
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_creation: "always",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Mess Payment`,
            description: note || `Payment for mess ${messId}`,
          },
          unit_amount: Math.round(amount * 100), // Stripe uses cents
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId,
      messId,
      amount: String(amount),
      note: note || "",
    },
    success_url: `${CLIENT_URL}/mess/${messId}/payments?session_id={CHECKOUT_SESSION_ID}&success=true`,
    cancel_url: `${CLIENT_URL}/mess/${messId}/payments?cancelled=true`,
  });

  return { sessionId: session.id, url: session.url };
};

/**
 * Retrieve a Stripe Checkout Session by ID.
 * Returns session object with payment_status.
 */
export const retrieveCheckoutSession = async (sessionId) => {
  if (!sessionId) {
    throw new AppError("Session ID is required", 400);
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session;
  } catch {
    throw new AppError("Invalid or expired Stripe session", 400);
  }
};
