import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { paymentApi } from "@/services"
import type { CreatePaymentInput } from "@/types/api"

export function usePayments(messId: string) {
  return useQuery({
    queryKey: ["mess-payments", messId],
    queryFn: () => paymentApi.getAll(messId),
    enabled: !!messId,
  })
}

export function usePaymentDetail(messId: string, paymentId: string | null) {
  return useQuery({
    queryKey: ["mess-payment", messId, paymentId],
    queryFn: () => paymentApi.getById(messId, paymentId!),
    enabled: !!messId && !!paymentId,
  })
}

export function useCreatePayment(messId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePaymentInput) => paymentApi.create(messId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mess-payments", messId] })
    },
  })
}

export function useUpdatePaymentStatus(messId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, data }: { paymentId: string; data: { amount?: number; method?: string; note?: string; status?: string } }) =>
      paymentApi.updateStatus(messId, paymentId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mess-payments", messId] })
    },
  })
}

export function useDeletePayment(messId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: string) => paymentApi.delete(messId, paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mess-payments", messId] })
    },
  })
}
