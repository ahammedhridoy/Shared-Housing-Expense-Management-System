import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/stores/auth.store"
import { authApi } from "@/services"

export function useAuth() {
  const { user, isAuthenticated, isLoading, hasCheckedAuth, setUser } =
    useAuthStore()

  useEffect(() => {
    if (hasCheckedAuth) return

    const checkAuth = async () => {
      try {
        const { user } = await authApi.getMe()
        setUser(user)
      } catch {
        setUser(null)
      }
    }

    checkAuth()
  }, [hasCheckedAuth, setUser])

  return { user, isAuthenticated, isLoading }
}

export function useRequireAuth() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login", { replace: true })
    }
  }, [isLoading, isAuthenticated, navigate])

  return { user, isAuthenticated, isLoading }
}

export function useGuestOnly() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true })
    }
  }, [isLoading, isAuthenticated, navigate])

  return { isAuthenticated, isLoading }
}
