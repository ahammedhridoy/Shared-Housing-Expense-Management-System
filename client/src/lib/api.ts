import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"
import type { ApiResponse } from "@/types/api"

const api = axios.create({
  // Production always calls same-origin "/api/v1", which Vercel rewrites to the backend
  // (client/vercel.json). Calling the backend's own domain directly would make the auth
  // cookies third-party, so the browser drops them and every refresh logs the user out.
  // VITE_API_URL only applies in development (Vite also proxies /api to localhost:5001).
  baseURL: import.meta.env.DEV ? import.meta.env.VITE_API_URL || "/api/v1" : "/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

let isRefreshing = false
let failedQueue: {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}[] = []

const processQueue = (error: unknown | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(undefined)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    const url = originalRequest?.url || ""

    // Skip interceptor for login, register, and refresh endpoints
    const isExemptAuthRequest =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh")

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isExemptAuthRequest
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        await api.post("/auth/refresh")
        processQueue(null)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError)
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    const message =
      error.response?.data?.message || error.message || "Something went wrong"

    return Promise.reject(new Error(message))
  }
)

export default api
