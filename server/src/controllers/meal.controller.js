import { getMonthMeals, setMeals } from "../services/meal.service.js";
import { handle, send } from "../utils/respond.js";

export const getMonthMealsController = handle(async (req, res) => {
  const meals = await getMonthMeals({ userId: req.user.userId, messId: req.params.messId, ...req.query });
  send(res, 200, "Meals fetched successfully", { meals });
});

export const setMealsController = handle(async (req, res) => {
  const result = await setMeals({ userId: req.user.userId, messId: req.params.messId, entries: req.body.entries });
  send(res, 200, "Meals saved successfully", result);
});
