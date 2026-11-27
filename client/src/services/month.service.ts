import api from "@/lib/api"
import type { ApiResponse, ClosedMonth, MonthSummary } from "@/types/api"

export const monthApi = {
  getSummary: async (messId: string, year: number, month: number) => {
    const response = await api.get<ApiResponse<{ summary: MonthSummary }>>(
      `/mess/${messId}/months/${year}/${month}`
    )
    return response.data.data.summary
  },

  close: async (messId: string, year: number, month: number) => {
    const response = await api.post<ApiResponse<{ summary: MonthSummary }>>(
      `/mess/${messId}/months/${year}/${month}/close`
    )
    return response.data.data.summary
  },

  reopen: async (messId: string, year: number, month: number) => {
    const response = await api.post<ApiResponse<{ summary: MonthSummary }>>(
      `/mess/${messId}/months/${year}/${month}/reopen`
    )
    return response.data.data.summary
  },

  listClosed: async (messId: string) => {
    const response = await api.get<ApiResponse<{ months: ClosedMonth[] }>>(`/mess/${messId}/months`)
    return response.data.data.months
  },
}
