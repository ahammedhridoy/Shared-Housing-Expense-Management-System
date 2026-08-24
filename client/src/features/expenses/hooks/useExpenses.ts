import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { expenseApi } from "@/services"
import type { CreateExpenseInput } from "@/types/api"

export function useExpenses(messId: string) {
  return useQuery({
    queryKey: ["mess-expenses", messId],
    queryFn: () => expenseApi.getAll(messId),
    enabled: !!messId,
  })
}

export function useExpenseDetail(messId: string, expenseId: string | null) {
  return useQuery({
    queryKey: ["mess-expense", messId, expenseId],
    queryFn: () => expenseApi.getById(messId, expenseId!),
    enabled: !!messId && !!expenseId,
  })
}

export function useCreateExpense(messId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateExpenseInput) => expenseApi.create(messId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mess-expenses", messId] })
    },
  })
}

export function useUpdateExpense(messId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ expenseId, data }: { expenseId: string; data: Partial<CreateExpenseInput> }) =>
      expenseApi.update(messId, expenseId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mess-expenses", messId] })
    },
  })
}

export function useDeleteExpense(messId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (expenseId: string) => expenseApi.delete(messId, expenseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mess-expenses", messId] })
    },
  })
}
