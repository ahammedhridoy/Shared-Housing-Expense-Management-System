import {
  addMeal,
  getMyMeals,
  getMessMeals,
  updateMeal,
  deleteMeal,
} from "../services/meal.service.js";

export const addMealController = async (req, res, next) => {
  try {
    const { messId } = req.params;
    const { date, type, quantity } = req.body;

    const meal = await addMeal({
      userId: req.user.userId,
      messId,
      date,
      type,
      quantity,
    });

    res.status(201).json({
      success: true,
      message: "Meal added successfully",
      data: { meal },
    });
  } catch (error) {
    next(error);
  }
};

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
      data: { meals, count: meals.length },
    });
  } catch (error) {
    next(error);
  }
};

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
      data: { meals, count: meals.length },
    });
  } catch (error) {
    next(error);
  }
};

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
      quantity,
    });

    res.status(200).json({
      success: true,
      message: "Meal updated successfully",
      data: { meal },
    });
  } catch (error) {
    next(error);
  }
};

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
