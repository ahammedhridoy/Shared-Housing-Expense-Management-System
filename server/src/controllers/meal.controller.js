import {
  addMeal,
  getMyMeals,
  getMessMeals,
  updateMeal,
  deleteMeal,
} from "../services/meal.service.js";
import AppError from "../utils/AppError.js";

// Add a meal for a user in a mess
export const addMealController = async (req, res, next) => {
  try {
    const { messId } = req.params;

    const { date, type, quantity = 1 } = req.body;

    if (!date) {
      throw new AppError("Meal date is required", 400);
    }

    if (!type) {
      throw new AppError("Meal type is required", 400);
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

// Get my meals in a mess
export const getMyMealsController = async (req, res, next) => {
  try {
    const { messId } = req.params;

    const { startDate, endDate, type } = req.query;

    const meals = await getMyMeals({
      userId: req.user.userId,
      messId,
      startDate,
      endDate,
      type,
    });

    res.status(200).json({
      success: true,
      message: "Meals fetched successfully",
      data: {
        meals,
        count: meals.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all meals in a mess
export const getMessMealsController = async (req, res, next) => {
  try {
    const { messId } = req.params;

    const { startDate, endDate, type } = req.query;

    const meals = await getMessMeals({
      messId,
      startDate,
      endDate,
      type,
    });

    res.status(200).json({
      success: true,
      message: "Mess meals fetched successfully",
      data: {
        meals,
        count: meals.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update a meal
export const updateMealController = async (req, res, next) => {
  try {
    const { messId, mealId } = req.params;

    const { date, type, quantity } = req.body;

    const meal = await updateMeal({
      userId: req.user.userId,
      messId,
      mealId,
      date,
      type,
      quantity: quantity !== undefined ? Number(quantity) : undefined,
    });

    res.status(200).json({
      success: true,
      message: "Meal updated successfully",
      data: {
        meal,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete a meal
export const deleteMealController = async (req, res, next) => {
  try {
    const { messId, mealId } = req.params;

    await deleteMeal({
      userId: req.user.userId,
      messId,
      mealId,
    });

    res.status(200).json({
      success: true,
      message: "Meal deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
