import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { authApi } from "@/services"
import type { ResetPasswordInput } from "@/types/api"

export function useResetPassword() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data: ResetPasswordInput) => authApi.resetPassword(data),
    onSuccess: () => {
      navigate("/login", { replace: true })
    },
  })
}
