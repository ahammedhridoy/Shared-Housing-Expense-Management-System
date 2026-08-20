import { addMeal } from "../services/meal.service.js";

// Add a meal for a user in a mess
export const addMealController = async (req, res, next) => {
  try {
    const { messId } = req.params;

    const { date, type, quantity = 1 } = req.body;

    if (!date) {
      const error = new Error("Meal date is required");
      error.statusCode = 400;
      throw error;
    }

    if (!type) {
      const error = new Error("Meal type is required");
      error.statusCode = 400;
      throw error;
    }

    const meal = await addMeal({
      userId: req.user.userId,
      messId,
      date,
      type,
      quantity: Number(quantity),
    });

    res.status(201).json({
      success: true,
      message: "Meal added successfully",
      data: {
        meal,
      },
    });
  } catch (error) {
    next(error);
  }
};
