import prisma from "../config/database.js";
import AppError from "../utils/AppError.js";

const VALID_METHODS = ["CASH", "BANK", "MOBILE_BANKING", "OTHER"];

// Add a payment (manager only)
export const addPayment = async ({ userId, messId, payerId, amount, date, method, note }) => {
  const membership = await prisma.messMember.findUnique({
    where: {
      userId_messId: {
        userId,
        messId,
      },
    },
  });

  if (!membership) {
    throw new AppError("You are not a member of this mess", 403);
  }

  if (membership.role !== "MANAGER") {
    throw new AppError("Only mess managers can record payments", 403);
  }

  const payerMembership = await prisma.messMember.findUnique({
    where: {
      userId_messId: {
        userId: payerId,
        messId,
      },
    },
  });

  if (!payerMembership) {
    throw new AppError("Payer is not a member of this mess", 400);
  }

  if (!amount || typeof amount !== "number" || amount <= 0) {
    throw new AppError("Payment amount must be a positive number", 400);
  }

  if (!date) {
    throw new AppError("Payment date is required", 400);
  }

  const paymentDate = new Date(date);

  if (Number.isNaN(paymentDate.getTime())) {
    throw new AppError("Invalid payment date", 400);
  }

  if (!method) {
    throw new AppError("Payment method is required", 400);
  }

  if (!VALID_METHODS.includes(method)) {
    throw new AppError(`Invalid payment method. Valid methods: ${VALID_METHODS.join(", ")}`, 400);
  }

  const payment = await prisma.payment.create({
    data: {
      messId,
      userId: payerId,
      recordedBy: userId,
      amount,
      date: paymentDate,
      method,
      note: note?.trim() || null,
    },
    select: {
      id: true,
      messId: true,
      userId: true,
      recordedBy: true,
      amount: true,
      date: true,
      method: true,
      note: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      recorder: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return payment;
};

// Get all payments of a mess (members only)
export const getPayments = async ({ userId, messId, startDate, endDate, method }) => {
  const membership = await prisma.messMember.findUnique({
    where: {
      userId_messId: {
        userId,
        messId,
      },
    },
  });

  if (!membership) {
    throw new AppError("You are not a member of this mess", 403);
  }

  const where = {
    messId,
  };

  if (startDate || endDate) {
    where.date = {};

    if (startDate) {
      const start = new Date(startDate);

      if (Number.isNaN(start.getTime())) {
        throw new AppError("Invalid start date", 400);
      }

      where.date.gte = start;
    }

    if (endDate) {
      const end = new Date(endDate);

      if (Number.isNaN(end.getTime())) {
        throw new AppError("Invalid end date", 400);
      }

      where.date.lte = end;
    }
  }

  if (method) {
    if (!VALID_METHODS.includes(method)) {
      throw new AppError(`Invalid payment method. Valid methods: ${VALID_METHODS.join(", ")}`, 400);
    }

    where.method = method;
  }

  const payments = await prisma.payment.findMany({
    where,
    select: {
      id: true,
      messId: true,
      userId: true,
      recordedBy: true,
      amount: true,
      date: true,
      method: true,
      note: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      recorder: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  return payments;
};

// Get single payment by ID
export const getPaymentById = async ({ userId, messId, paymentId }) => {
  const membership = await prisma.messMember.findUnique({
    where: {
      userId_messId: {
        userId,
        messId,
      },
    },
  });

  if (!membership) {
    throw new AppError("You are not a member of this mess", 403);
  }

  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      messId,
    },
    select: {
      id: true,
      messId: true,
      userId: true,
      recordedBy: true,
      amount: true,
      date: true,
      method: true,
      note: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      recorder: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError("Payment not found", 404);
  }

  return payment;
};

// Update a payment (manager only)
export const updatePayment = async ({ userId, messId, paymentId, payerId, amount, date, method, note }) => {
  const membership = await prisma.messMember.findUnique({
    where: {
      userId_messId: {
        userId,
        messId,
      },
    },
  });

  if (!membership) {
    throw new AppError("You are not a member of this mess", 403);
  }

  if (membership.role !== "MANAGER") {
    throw new AppError("Only mess managers can update payments", 403);
  }

  const existingPayment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      messId,
    },
  });

  if (!existingPayment) {
    throw new AppError("Payment not found", 404);
  }

  if (payerId) {
    const payerMembership = await prisma.messMember.findUnique({
      where: {
        userId_messId: {
          userId: payerId,
          messId,
        },
      },
    });

    if (!payerMembership) {
      throw new AppError("Payer is not a member of this mess", 400);
    }
  }

  if (amount !== undefined && (typeof amount !== "number" || amount <= 0)) {
    throw new AppError("Payment amount must be a positive number", 400);
  }

  if (date !== undefined) {
    const paymentDate = new Date(date);

    if (Number.isNaN(paymentDate.getTime())) {
      throw new AppError("Invalid payment date", 400);
    }
  }

  if (method !== undefined && !VALID_METHODS.includes(method)) {
    throw new AppError(`Invalid payment method. Valid methods: ${VALID_METHODS.join(", ")}`, 400);
  }

  const updateData = {};

  if (payerId !== undefined) updateData.userId = payerId;
  if (amount !== undefined) updateData.amount = amount;
  if (date !== undefined) updateData.date = new Date(date);
  if (method !== undefined) updateData.method = method;
  if (note !== undefined) updateData.note = note?.trim() || null;

  const updatedPayment = await prisma.payment.update({
    where: {
      id: paymentId,
    },
    data: updateData,
    select: {
      id: true,
      messId: true,
      userId: true,
      recordedBy: true,
      amount: true,
      date: true,
      method: true,
      note: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      recorder: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return updatedPayment;
};

// Delete a payment (manager only)
export const deletePayment = async ({ userId, messId, paymentId }) => {
  const membership = await prisma.messMember.findUnique({
    where: {
      userId_messId: {
        userId,
        messId,
      },
    },
  });

  if (!membership) {
    throw new AppError("You are not a member of this mess", 403);
  }

  if (membership.role !== "MANAGER") {
    throw new AppError("Only mess managers can delete payments", 403);
  }

  const existingPayment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      messId,
    },
  });

  if (!existingPayment) {
    throw new AppError("Payment not found", 404);
  }

  await prisma.payment.delete({
    where: {
      id: paymentId,
    },
  });

  return { message: "Payment deleted successfully" };
};
