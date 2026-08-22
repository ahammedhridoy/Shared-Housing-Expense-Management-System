import api from "@/lib/api"
import type { ApiResponse, CreateExpenseInput, Expense } from "@/types/api"

export interface ExpenseWithRecorder extends Expense {
  recorder: { id: string; name: string; email: string }
}

export interface PaginatedExpenses {
  count: number
  expenses: ExpenseWithRecorder[]
}

export const expenseApi = {
  create: async (messId: string, data: CreateExpenseInput) => {
    const response = await api.post<ApiResponse<{ expense: Expense }>>(
      `/mess/${messId}/expenses`,
      { ...data, date: new Date(data.date).toISOString() }
    )
    return response.data.data.expense
  },

  getAll: async (messId: string) => {
    const response = await api.get<ApiResponse<PaginatedExpenses>>(
      `/mess/${messId}/expenses`
    )
    return response.data.data
  },

  getById: async (messId: string, expenseId: string) => {
    const response = await api.get<ApiResponse<{ expense: ExpenseWithRecorder }>>(
      `/mess/${messId}/expenses/${expenseId}`
    )
    return response.data.data.expense
  },

  update: async (
    messId: string,
    expenseId: string,
    data: Partial<CreateExpenseInput>
  ) => {
    const response = await api.put<ApiResponse<{ expense: Expense }>>(
      `/mess/${messId}/expenses/${expenseId}`,
      data
    )
    return response.data.data.expense
  },

  delete: async (messId: string, expenseId: string) => {
    const response = await api.delete<ApiResponse<null>>(
      `/mess/${messId}/expenses/${expenseId}`
    )
    return response.data
  },
}
