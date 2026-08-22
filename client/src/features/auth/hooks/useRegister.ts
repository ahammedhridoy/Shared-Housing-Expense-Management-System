import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { authApi } from "@/services"
import { useAuthStore } from "@/stores/auth.store"
import type { RegisterInput } from "@/types/api"

export function useRegister() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  return useMutation({
    mutationFn: (data: RegisterInput) => authApi.register(data),
    onSuccess: (data) => {
      setUser(data.user)
      navigate("/dashboard", { replace: true })
    },
  })
}
