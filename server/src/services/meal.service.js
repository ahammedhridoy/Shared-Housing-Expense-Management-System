import prisma from "../config/database.js";
import AppError from "../utils/AppError.js";

// Add a meal for a user in a mess
export const addMeal = async ({ userId, messId, date, type, quantity }) => {
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

  if (!["BREAKFAST", "LUNCH", "DINNER"].includes(type)) {
    throw new AppError("Invalid meal type", 400);
  }

  if (quantity <= 0) {
    throw new AppError("Meal quantity must be greater than 0", 400);
  }

  const mealDate = new Date(date);

  if (Number.isNaN(mealDate.getTime())) {
    throw new AppError("Invalid meal date", 400);
  }

  const meal = await prisma.meal.create({
    data: {
      userId,
      messId,
      date: mealDate,
      type,
      quantity,
    },
    select: {
      id: true,
      userId: true,
      messId: true,
      date: true,
      type: true,
      quantity: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return meal;
};

// Get all meals of a user in a mess with optional filters
export const getMyMeals = async ({ userId, messId, startDate, endDate, type }) => {
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
    userId,
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

  if (type) {
    if (!["BREAKFAST", "LUNCH", "DINNER"].includes(type)) {
      throw new AppError("Invalid meal type", 400);
    }

    where.type = type;
  }

  const meals = await prisma.meal.findMany({
    where,
    select: {
      id: true,
      userId: true,
      messId: true,
      date: true,
      type: true,
      quantity: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      date: "desc",
    },
  });

  return meals;
};

// Get all meals of a mess (all members) with optional filters
export const getMessMeals = async ({ messId, startDate, endDate, type }) => {
  const mess = await prisma.mess.findUnique({
    where: { id: messId },
  });

  if (!mess) {
    throw new AppError("Mess not found", 404);
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

  if (type) {
    if (!["BREAKFAST", "LUNCH", "DINNER"].includes(type)) {
      throw new AppError("Invalid meal type", 400);
    }

    where.type = type;
  }

  const meals = await prisma.meal.findMany({
    where,
    select: {
      id: true,
      userId: true,
      messId: true,
      date: true,
      type: true,
      quantity: true,
      createdAt: true,
      updatedAt: true,
      user: {
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

  return meals;
};

// Update a meal
export const updateMeal = async ({ userId, messId, mealId, date, type, quantity }) => {
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

  const existingMeal = await prisma.meal.findUnique({
    where: { id: mealId },
  });

  if (!existingMeal) {
    throw new AppError("Meal not found", 404);
  }

  if (existingMeal.userId !== userId) {
    throw new AppError("You can only update your own meals", 403);
  }

  if (existingMeal.messId !== messId) {
    throw new AppError("Meal does not belong to this mess", 400);
  }

  if (type && !["BREAKFAST", "LUNCH", "DINNER"].includes(type)) {
    throw new AppError("Invalid meal type", 400);
  }

  if (quantity !== undefined && quantity <= 0) {
    throw new AppError("Meal quantity must be greater than 0", 400);
  }

  const updateData = {};

  if (date) {
    const mealDate = new Date(date);

    if (Number.isNaN(mealDate.getTime())) {
      throw new AppError("Invalid meal date", 400);
    }

    updateData.date = mealDate;
  }

  if (type) {
    updateData.type = type;
  }

  if (quantity !== undefined) {
    updateData.quantity = Number(quantity);
  }

  const meal = await prisma.meal.update({
    where: { id: mealId },
    data: updateData,
    select: {
      id: true,
      userId: true,
      messId: true,
      date: true,
      type: true,
      quantity: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return meal;
};

// Delete a meal
export const deleteMeal = async ({ userId, messId, mealId }) => {
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

  const existingMeal = await prisma.meal.findUnique({
    where: { id: mealId },
  });

  if (!existingMeal) {
    throw new AppError("Meal not found", 404);
  }

  if (existingMeal.userId !== userId) {
    throw new AppError("You can only delete your own meals", 403);
  }

  if (existingMeal.messId !== messId) {
    throw new AppError("Meal does not belong to this mess", 400);
  }

  await prisma.meal.delete({
    where: { id: mealId },
  });
};
