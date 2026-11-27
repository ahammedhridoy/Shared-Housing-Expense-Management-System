import api from "@/lib/api"
import type { ApiResponse, MealEntry, MealEntryInput } from "@/types/api"

export const mealApi = {
  getMonth: async (messId: string, year: number, month: number) => {
    const response = await api.get<ApiResponse<{ meals: MealEntry[] }>>(`/mess/${messId}/meals`, {
      params: { year, month },
    })
    return response.data.data.meals
  },

  // count 0 removes the entry
  set: async (messId: string, entries: MealEntryInput[]) => {
    const response = await api.put<ApiResponse<{ updated: number }>>(`/mess/${messId}/meals`, { entries })
    return response.data.data
  },
}
