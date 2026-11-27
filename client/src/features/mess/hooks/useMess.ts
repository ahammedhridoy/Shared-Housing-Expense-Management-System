import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query"
import { messApi, monthApi } from "@/services"
import { messKeys } from "./useMessData"
import type { CreateMessInput, MessListItem } from "@/types/api"

export function useMyMesses() {
  return useQuery({
    queryKey: ["messes"],
    queryFn: messApi.getMy,
  })
}

/** This month's summary for each of the user's messes (dashboard) */
export function useMessesThisMonth(messes: MessListItem[] | undefined, year: number, month: number) {
  return useQueries({
    queries: (messes ?? []).map((m) => ({
      queryKey: [...messKeys.month(m.id, year, month), "summary"],
      queryFn: () => monthApi.getSummary(m.id, year, month),
    })),
  })
}

export function useCreateMess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMessInput) => messApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messes"] }),
  })
}

export function useUpdateMess(messId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Omit<CreateMessInput, "rentAmount">>) => messApi.update(messId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messKeys.all(messId) })
      queryClient.invalidateQueries({ queryKey: ["messes"] })
    },
  })
}

export function useDeleteMess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (messId: string) => messApi.delete(messId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messes"] }),
  })
}
