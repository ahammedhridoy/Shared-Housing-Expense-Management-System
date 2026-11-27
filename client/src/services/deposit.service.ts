import api from "@/lib/api"
import type { ApiResponse, Deposit, DepositInput } from "@/types/api"

export const depositApi = {
  getMonth: async (messId: string, year: number, month: number) => {
    const response = await api.get<ApiResponse<{ deposits: Deposit[] }>>(`/mess/${messId}/deposits`, {
      params: { year, month },
    })
    return response.data.data.deposits
  },

  create: async (messId: string, data: DepositInput) => {
    const response = await api.post<ApiResponse<{ deposit: Deposit }>>(`/mess/${messId}/deposits`, data)
    return response.data.data.deposit
  },

  update: async (messId: string, depositId: string, data: Partial<DepositInput>) => {
    const response = await api.put<ApiResponse<{ deposit: Deposit }>>(
      `/mess/${messId}/deposits/${depositId}`,
      data
    )
    return response.data.data.deposit
  },

  delete: async (messId: string, depositId: string) => {
    await api.delete(`/mess/${messId}/deposits/${depositId}`)
  },
}
