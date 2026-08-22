import api from "@/lib/api"
import type {
  ApiResponse,
  AuthResponse,
  LoginInput,
  RegisterInput,
} from "@/types/api"

export const authApi = {
  register: async (data: RegisterInput) => {
    const response = await api.post<ApiResponse<AuthResponse>>(
      "/auth/register",
      data
    )
    return response.data.data
  },

  login: async (data: LoginInput) => {
    const response = await api.post<ApiResponse<AuthResponse>>(
      "/auth/login",
      data
    )
    return response.data.data
  },

  logout: async () => {
    const response = await api.post<ApiResponse<null>>("/auth/logout")
    return response.data
  },

  refresh: async () => {
    const response = await api.post<ApiResponse<null>>("/auth/refresh")
    return response.data
  },

  getMe: async () => {
    const response = await api.get<ApiResponse<AuthResponse>>("/auth/me")
    return response.data.data
  },
}
