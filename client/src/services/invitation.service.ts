import api from "@/lib/api"
import type { ApiResponse, Invitation } from "@/types/api"

export const invitationApi = {
  getMyPending: async () => {
    const response = await api.get<ApiResponse<{ invitations: Invitation[] }>>("/invitations/pending")
    return response.data.data.invitations
  },

  getByMess: async (messId: string) => {
    const response = await api.get<ApiResponse<{ invitations: Invitation[] }>>(
      `/invitations/mess/${messId}`
    )
    return response.data.data.invitations
  },

  send: async (messId: string, email: string) => {
    const response = await api.post<ApiResponse<{ invitation: Invitation }>>(
      `/invitations/mess/${messId}`,
      { email }
    )
    return response.data.data.invitation
  },

  accept: async (invitationId: string) => {
    const response = await api.post<ApiResponse<{ membership: unknown }>>(
      `/invitations/${invitationId}/accept`
    )
    return response.data.data
  },

  cancel: async (invitationId: string) => {
    const response = await api.delete<ApiResponse<null>>(
      `/invitations/${invitationId}/cancel`
    )
    return response.data
  },

  reject: async (invitationId: string) => {
    const response = await api.post<ApiResponse<null>>(
      `/invitations/${invitationId}/reject`
    )
    return response.data
  },
}
