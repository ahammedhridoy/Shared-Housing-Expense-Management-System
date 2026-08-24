import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { settlementApi } from "@/services"

export function useMySettlements(messId: string) {
  return useQuery({
    queryKey: ["my-settlements", messId],
    queryFn: () => settlementApi.getMy(messId),
    enabled: !!messId,
  })
}

export function useSettlementsByBill(messId: string, billId: string | null) {
  return useQuery({
    queryKey: ["bill-settlements", messId, billId],
    queryFn: () => settlementApi.getByBill(messId, billId!),
    enabled: !!messId && !!billId,
  })
}

export function usePaySettlement(messId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ settlementId, data }: { settlementId: string; data: { amount: number; method?: string } }) =>
      settlementApi.pay(messId, settlementId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-settlements", messId] })
    },
  })
}
