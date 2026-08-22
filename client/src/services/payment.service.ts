import api from "@/lib/api"
import type { ApiResponse, CreatePaymentInput, Payment } from "@/types/api"

export interface PaymentWithRelations extends Payment {
  user: { id: string; name: string; email: string }
  recorder: { id: string; name: string; email: string }
}

export interface PaginatedPayments {
  count: number
  payments: PaymentWithRelations[]
}

export const paymentApi = {
  create: async (messId: string, data: CreatePaymentInput) => {
    const response = await api.post<ApiResponse<{ payment: PaymentWithRelations }>>(
      `/mess/${messId}/payments`,
      { ...data, date: new Date(data.date).toISOString() }
    )
    return response.data.data.payment
  },

  getAll: async (messId: string) => {
    const response = await api.get<ApiResponse<PaginatedPayments>>(
      `/mess/${messId}/payments`
    )
    return response.data.data
  },

  getById: async (messId: string, paymentId: string) => {
    const response = await api.get<ApiResponse<{ payment: PaymentWithRelations }>>(
      `/mess/${messId}/payments/${paymentId}`
    )
    return response.data.data.payment
  },

  updateStatus: async (
    messId: string,
    paymentId: string,
    data: { amount?: number; method?: string; note?: string; status?: string }
  ) => {
    const response = await api.put<ApiResponse<{ payment: PaymentWithRelations }>>(
      `/mess/${messId}/payments/${paymentId}`,
      data
    )
    return response.data.data.payment
  },

  delete: async (messId: string, paymentId: string) => {
    const response = await api.delete<ApiResponse<null>>(
      `/mess/${messId}/payments/${paymentId}`
    )
    return response.data
  },
}
