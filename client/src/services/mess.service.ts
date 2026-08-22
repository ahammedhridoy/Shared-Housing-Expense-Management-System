import api from "@/lib/api"
import type { ApiResponse, CreateMessInput, MessListItem, MessDetail } from "@/types/api"

export interface MessMemberWithUser {
  id: string
  role: string
  createdAt: string
  user: { id: string; name: string; email: string }
}

export const messApi = {
  create: async (data: CreateMessInput) => {
    const response = await api.post<ApiResponse<{ mess: MessListItem }>>("/mess", data)
    return response.data.data.mess
  },

  getMy: async () => {
    const response = await api.get<ApiResponse<{ messes: MessListItem[] }>>("/mess/my")
    return response.data.data.messes
  },

  getById: async (messId: string) => {
    const response = await api.get<ApiResponse<{ mess: MessDetail }>>(`/mess/${messId}`)
    return response.data.data.mess
  },

  update: async (messId: string, data: Partial<CreateMessInput>) => {
    const response = await api.patch<ApiResponse<{ mess: MessDetail }>>(
      `/mess/${messId}`,
      data
    )
    return response.data.data.mess
  },

  delete: async (messId: string) => {
    const response = await api.delete<ApiResponse<null>>(`/mess/${messId}`)
    return response.data
  },

  getMembers: async (messId: string) => {
    const response = await api.get<ApiResponse<{ members: MessMemberWithUser[]; count: number }>>(
      `/mess/${messId}/members`
    )
    return response.data.data
  },

  removeMember: async (messId: string, userId: string) => {
    const response = await api.delete<ApiResponse<null>>(
      `/mess/${messId}/members/${userId}`
    )
    return response.data
  },
}
