import api from "@/lib/api"
import type { ApiResponse, CreateMessInput, MessListItem, MessDetail, MessMember } from "@/types/api"

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

  update: async (messId: string, data: Partial<Omit<CreateMessInput, "rentAmount">>) => {
    const response = await api.patch<ApiResponse<{ mess: MessDetail }>>(`/mess/${messId}`, data)
    return response.data.data.mess
  },

  delete: async (messId: string) => {
    await api.delete(`/mess/${messId}`)
  },

  getMembers: async (messId: string) => {
    const response = await api.get<ApiResponse<{ members: MessMember[]; count: number }>>(
      `/mess/${messId}/members`
    )
    return response.data.data.members
  },

  updateMember: async (
    messId: string,
    userId: string,
    data: { rentAmount?: number; role?: "MANAGER" | "MEMBER" }
  ) => {
    const response = await api.patch<ApiResponse<{ member: MessMember }>>(
      `/mess/${messId}/members/${userId}`,
      data
    )
    return response.data.data.member
  },

  removeMember: async (messId: string, userId: string) => {
    await api.delete(`/mess/${messId}/members/${userId}`)
  },
}
