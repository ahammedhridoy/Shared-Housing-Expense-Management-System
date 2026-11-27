import api from "@/lib/api"
import type { ApiResponse, Expense, ExpenseInput } from "@/types/api"

export const expenseApi = {
  getMonth: async (messId: string, year: number, month: number) => {
    const response = await api.get<ApiResponse<{ expenses: Expense[] }>>(`/mess/${messId}/expenses`, {
      params: { year, month },
    })
    return response.data.data.expenses
  },

  create: async (messId: string, data: ExpenseInput) => {
    const response = await api.post<ApiResponse<{ expense: Expense }>>(`/mess/${messId}/expenses`, data)
    return response.data.data.expense
  },

  update: async (messId: string, expenseId: string, data: Partial<ExpenseInput>) => {
    const response = await api.put<ApiResponse<{ expense: Expense }>>(
      `/mess/${messId}/expenses/${expenseId}`,
      data
    )
    return response.data.data.expense
  },

  delete: async (messId: string, expenseId: string) => {
    await api.delete(`/mess/${messId}/expenses/${expenseId}`)
  },
}
