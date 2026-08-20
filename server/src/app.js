import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import notFound from "./middlewares/notFound.middleware.js";
import errorHandler from "./middlewares/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import messRoutes from "./routes/mess.routes.js";
import invitationRoutes from "./routes/invitation.routes.js";
import mealRoutes from "./routes/meal.routes.js";
import expenseRoutes from "./routes/expense.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import monthlyBillRoutes from "./routes/monthlyBill.routes.js";
import settlementRoutes from "./routes/settlement.routes.js";

const app = express();

// Security
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookies
app.use(cookieParser());

// HTTP request logging
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Health check
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
  });
});

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/mess", messRoutes);
app.use("/api/v1/invitations", invitationRoutes);
app.use("/api/v1", mealRoutes);
app.use("/api/v1", expenseRoutes);
app.use("/api/v1", paymentRoutes);
app.use("/api/v1", monthlyBillRoutes);
app.use("/api/v1", settlementRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;
