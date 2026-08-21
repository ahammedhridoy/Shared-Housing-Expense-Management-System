import prisma from "../config/database.js";
import AppError from "../utils/AppError.js";

// Manager adds meal for a user
export const addMeal = async ({ managerId, messId, userId, date, type, quantity }) => {
  const managerMembership = await prisma.messMember.findUnique({
    where: {
      userId_messId: {
        userId: managerId,
        messId,
      },
    },
  });

  if (!managerMembership) {
    throw new AppError("You are not a member of this mess", 403);
  }

  if (managerMembership.role !== "MANAGER") {
    throw new AppError("Only manager can add meals", 403);
  }

  const userMembership = await prisma.messMember.findUnique({
    where: {
      userId_messId: {
        userId,
        messId,
      },
    },
  });

  if (!userMembership) {
    throw new AppError("User is not a member of this mess", 404);
  }

  const meal = await prisma.meal.create({
    data: {
      userId,
      messId,
      date: new Date(date),
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

// User gets their own meals in a mess
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

// Get all meals of a mess (any member can view)
export const getMessMeals = async ({ messId, userId, startDate, endDate, type }) => {
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

  if (type) {
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

// Manager updates a meal
export const updateMeal = async ({ managerId, messId, mealId, userId, date, type, quantity }) => {
  const managerMembership = await prisma.messMember.findUnique({
    where: {
      userId_messId: {
        userId: managerId,
        messId,
      },
    },
  });

  if (!managerMembership) {
    throw new AppError("You are not a member of this mess", 403);
  }

  if (managerMembership.role !== "MANAGER") {
    throw new AppError("Only manager can update meals", 403);
  }

  const existingMeal = await prisma.meal.findUnique({
    where: { id: mealId },
  });

  if (!existingMeal) {
    throw new AppError("Meal not found", 404);
  }

  if (existingMeal.messId !== messId) {
    throw new AppError("Meal does not belong to this mess", 400);
  }

  const updateData = {};

  if (userId) {
    const userMembership = await prisma.messMember.findUnique({
      where: {
        userId_messId: {
          userId,
          messId,
        },
      },
    });

    if (!userMembership) {
      throw new AppError("User is not a member of this mess", 404);
    }

    updateData.userId = userId;
  }

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

// Manager deletes a meal
export const deleteMeal = async ({ managerId, messId, mealId }) => {
  const managerMembership = await prisma.messMember.findUnique({
    where: {
      userId_messId: {
        userId: managerId,
        messId,
      },
    },
  });

  if (!managerMembership) {
    throw new AppError("You are not a member of this mess", 403);
  }

  if (managerMembership.role !== "MANAGER") {
    throw new AppError("Only manager can delete meals", 403);
  }

  const existingMeal = await prisma.meal.findUnique({
    where: { id: mealId },
  });

  if (!existingMeal) {
    throw new AppError("Meal not found", 404);
  }

  if (existingMeal.messId !== messId) {
    throw new AppError("Meal does not belong to this mess", 400);
  }

  await prisma.meal.delete({
    where: { id: mealId },
  });
};
