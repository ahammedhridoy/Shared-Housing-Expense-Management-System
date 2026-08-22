import api from "@/lib/api"
import type { ApiResponse, Settlement } from "@/types/api"

export interface SettlementWithBill extends Settlement {
  bill: {
    id: string
    month: number
    year: number
    totalMeals: number
    totalExpense: number
    mealRate: number
    status: string
  }
}

export interface SettlementWithUser extends Settlement {
  user: { id: string; name: string; email: string }
}

export interface PaginatedSettlements {
  count: number
  settlements: SettlementWithBill[]
}

export const settlementApi = {
  getMy: async (messId: string) => {
    const response = await api.get<ApiResponse<PaginatedSettlements>>(
      `/mess/${messId}/settlements/my`
    )
    return response.data.data
  },

  getByBill: async (messId: string, billId: string) => {
    const response = await api.get<ApiResponse<{ settlements: SettlementWithUser[] }>>(
      `/mess/${messId}/settlements/bill/${billId}`
    )
    return response.data.data.settlements
  },

  pay: async (messId: string, settlementId: string, data: { amount: number; method?: string }) => {
    const response = await api.post<ApiResponse<{ settlement: SettlementWithUser }>>(
      `/mess/${messId}/settlements/${settlementId}/pay`,
      data
    )
    return response.data.data.settlement
  },
}
