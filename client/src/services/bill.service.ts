import api from "@/lib/api"
import type { ApiResponse, MonthlyBill } from "@/types/api"

export interface BillSettlement {
  id: string
  userId: string
  mealCount: number
  mealCost: number
  expenseShare: number
  totalAmount: number
  paidAmount: number
  dueAmount: number
  status: string
  user: { id: string; name: string; email: string }
}

export interface BillWithSettlements extends MonthlyBill {
  settlements: BillSettlement[]
}

export interface PaginatedBills {
  count: number
  bills: MonthlyBill[]
}

export const billApi = {
  finalize: async (messId: string, data: { month: number; year: number }) => {
    const response = await api.post<ApiResponse<{ bill: MonthlyBill; settlements: BillSettlement[] }>>(
      `/mess/${messId}/bills/finalize`,
      data
    )
    return response.data.data
  },

  getAll: async (messId: string) => {
    const response = await api.get<ApiResponse<PaginatedBills>>(
      `/mess/${messId}/bills`
    )
    return response.data.data
  },

  getByMonth: async (messId: string, month: number, year: number) => {
    const response = await api.get<ApiResponse<{ bill: BillWithSettlements }>>(
      `/mess/${messId}/bills/${month}/${year}`
    )
    return response.data.data.bill
  },
}
