import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { mealApi } from "@/services"
import type { LogMealInput } from "@/types/api"

export function useMealsAll(messId: string) {
  return useQuery({
    queryKey: ["mess-meals-all", messId],
    queryFn: () => mealApi.getAll(messId),
    enabled: !!messId,
  })
}

export function useMealsMy(messId: string) {
  return useQuery({
    queryKey: ["mess-meals-my", messId],
    queryFn: () => mealApi.getMy(messId),
    enabled: !!messId,
  })
}

export function useLogMeal(messId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: LogMealInput) => mealApi.log(messId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mess-meals-all", messId] })
      qc.invalidateQueries({ queryKey: ["mess-meals-my", messId] })
    },
  })
}

export function useUpdateMeal(messId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ mealId, data }: { mealId: string; data: Partial<LogMealInput> }) =>
      mealApi.update(messId, mealId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mess-meals-all", messId] })
      qc.invalidateQueries({ queryKey: ["mess-meals-my", messId] })
    },
  })
}

export function useDeleteMeal(messId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mealId: string) => mealApi.delete(messId, mealId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mess-meals-all", messId] })
      qc.invalidateQueries({ queryKey: ["mess-meals-my", messId] })
    },
  })
}
