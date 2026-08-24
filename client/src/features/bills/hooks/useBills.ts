import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { billApi } from "@/services"

export function useBills(messId: string) {
  return useQuery({
    queryKey: ["mess-bills", messId],
    queryFn: () => billApi.getAll(messId),
    enabled: !!messId,
  })
}

export function useBillDetail(messId: string, month: number | null, year: number | null) {
  return useQuery({
    queryKey: ["mess-bill-detail", messId, month, year],
    queryFn: () => billApi.getByMonth(messId, month!, year!),
    enabled: !!messId && !!month && !!year,
  })
}

export function useFinalizeBill(messId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { month: number; year: number }) => billApi.finalize(messId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mess-bills", messId] })
    },
  })
}
