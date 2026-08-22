import api from "@/lib/api"
import type { ApiResponse, LogMealInput, Meal } from "@/types/api"

export interface MealWithUser extends Meal {
  user: { id: string; name: string; email: string }
}

export interface PaginatedMeals {
  meals: MealWithUser[]
  count: number
}

export const mealApi = {
  log: async (messId: string, data: LogMealInput) => {
    const response = await api.post<ApiResponse<{ meal: Meal }>>(
      `/mess/${messId}/meals`,
      { ...data, date: new Date(data.date).toISOString() }
    )
    return response.data.data.meal
  },

  getAll: async (messId: string) => {
    const response = await api.get<ApiResponse<PaginatedMeals>>(
      `/mess/${messId}/meals/all`
    )
    return response.data.data
  },

  getMy: async (messId: string) => {
    const response = await api.get<ApiResponse<PaginatedMeals>>(
      `/mess/${messId}/meals`
    )
    return response.data.data
  },

  update: async (
    messId: string,
    mealId: string,
    data: Partial<LogMealInput>
  ) => {
    const response = await api.put<ApiResponse<{ meal: Meal }>>(
      `/mess/${messId}/meals/${mealId}`,
      data
    )
    return response.data.data.meal
  },

  delete: async (messId: string, mealId: string) => {
    const response = await api.delete<ApiResponse<null>>(
      `/mess/${messId}/meals/${mealId}`
    )
    return response.data
  },
}
