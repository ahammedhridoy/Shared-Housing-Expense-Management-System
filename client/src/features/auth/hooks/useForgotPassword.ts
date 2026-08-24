import { useMutation } from "@tanstack/react-query"
import { authApi } from "@/services"
import type { ForgotPasswordInput } from "@/types/api"

export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: ForgotPasswordInput) => authApi.forgotPassword(data),
  })
}
