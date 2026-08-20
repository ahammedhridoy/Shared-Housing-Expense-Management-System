import prisma from "../config/database.js";

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
    const error = new Error("You are not a member of this mess");

    error.statusCode = 403;
    throw error;
  }

  if (!["BREAKFAST", "LUNCH", "DINNER"].includes(type)) {
    const error = new Error("Invalid meal type");

    error.statusCode = 400;
    throw error;
  }

  if (quantity <= 0) {
    const error = new Error("Meal quantity must be greater than 0");

    error.statusCode = 400;
    throw error;
  }

  const mealDate = new Date(date);

  if (Number.isNaN(mealDate.getTime())) {
    const error = new Error("Invalid meal date");

    error.statusCode = 400;
    throw error;
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
