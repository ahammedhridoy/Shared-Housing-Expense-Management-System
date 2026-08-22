import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { messApi } from "@/services"
import type { CreateMessInput } from "@/types/api"

export function useMyMesses() {
  return useQuery({
    queryKey: ["messes"],
    queryFn: messApi.getMy,
  })
}

export function useMess(messId: string) {
  return useQuery({
    queryKey: ["mess", messId],
    queryFn: () => messApi.getById(messId),
    enabled: !!messId,
  })
}

export function useCreateMess() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateMessInput) => messApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messes"] })
    },
  })
}

export function useUpdateMess(messId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<CreateMessInput>) => messApi.update(messId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mess", messId] })
      queryClient.invalidateQueries({ queryKey: ["messes"] })
    },
  })
}

export function useDeleteMess() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (messId: string) => messApi.delete(messId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messes"] })
    },
  })
}
