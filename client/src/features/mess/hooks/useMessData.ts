import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { messApi, mealApi, expenseApi, depositApi, monthApi } from "@/services"
import { useMonthStore } from "@/lib/month"
import type { DepositInput, ExpenseInput, MealEntryInput } from "@/types/api"

// Query keys live under ["mess", messId, ...] so one invalidation refreshes a mess
export const messKeys = {
  all: (messId: string) => ["mess", messId] as const,
  detail: (messId: string) => ["mess", messId, "detail"] as const,
  members: (messId: string) => ["mess", messId, "members"] as const,
  month: (messId: string, y: number, m: number) => ["mess", messId, "month", y, m] as const,
  closed: (messId: string) => ["mess", messId, "closed"] as const,
}

/** messId from the URL plus the caller's role in the mess */
export function useMessContext() {
  const { messId = "" } = useParams()
  const { year, month } = useMonthStore()
  const detail = useQuery({
    queryKey: messKeys.detail(messId),
    queryFn: () => messApi.getById(messId),
    enabled: !!messId,
  })
  return {
    messId,
    year,
    month,
    mess: detail.data,
    isManager: detail.data?.membership.role === "MANAGER",
    isLoading: detail.isLoading,
    error: detail.error,
  }
}

function useInvalidateMess(messId: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: messKeys.all(messId) })
}

// Members
export function useMembers(messId: string) {
  return useQuery({
    queryKey: messKeys.members(messId),
    queryFn: () => messApi.getMembers(messId),
    enabled: !!messId,
  })
}

export function useUpdateMember(messId: string) {
  const invalidate = useInvalidateMess(messId)
  return useMutation({
    mutationFn: ({ userId, ...data }: { userId: string; rentAmount?: number; role?: "MANAGER" | "MEMBER" }) =>
      messApi.updateMember(messId, userId, data),
    onSuccess: invalidate,
  })
}

export function useRemoveMember(messId: string) {
  const invalidate = useInvalidateMess(messId)
  return useMutation({
    mutationFn: (userId: string) => messApi.removeMember(messId, userId),
    onSuccess: invalidate,
  })
}

// Month summary
export function useMonthSummary(messId: string, year: number, month: number) {
  return useQuery({
    queryKey: [...messKeys.month(messId, year, month), "summary"],
    queryFn: () => monthApi.getSummary(messId, year, month),
    enabled: !!messId,
  })
}

export function useCloseMonth(messId: string) {
  const invalidate = useInvalidateMess(messId)
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) => monthApi.close(messId, year, month),
    onSuccess: invalidate,
  })
}

export function useReopenMonth(messId: string) {
  const invalidate = useInvalidateMess(messId)
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) => monthApi.reopen(messId, year, month),
    onSuccess: invalidate,
  })
}

export function useClosedMonths(messId: string) {
  return useQuery({
    queryKey: messKeys.closed(messId),
    queryFn: () => monthApi.listClosed(messId),
    enabled: !!messId,
  })
}

// Meals
export function useMonthMeals(messId: string, year: number, month: number) {
  return useQuery({
    queryKey: [...messKeys.month(messId, year, month), "meals"],
    queryFn: () => mealApi.getMonth(messId, year, month),
    enabled: !!messId,
  })
}

export function useSetMeals(messId: string) {
  const invalidate = useInvalidateMess(messId)
  return useMutation({
    mutationFn: (entries: MealEntryInput[]) => mealApi.set(messId, entries),
    onSuccess: invalidate,
  })
}

// Expenses
export function useMonthExpenses(messId: string, year: number, month: number) {
  return useQuery({
    queryKey: [...messKeys.month(messId, year, month), "expenses"],
    queryFn: () => expenseApi.getMonth(messId, year, month),
    enabled: !!messId,
  })
}

export function useSaveExpense(messId: string) {
  const invalidate = useInvalidateMess(messId)
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: ExpenseInput }) =>
      id ? expenseApi.update(messId, id, data) : expenseApi.create(messId, data),
    onSuccess: invalidate,
  })
}

export function useDeleteExpense(messId: string) {
  const invalidate = useInvalidateMess(messId)
  return useMutation({
    mutationFn: (id: string) => expenseApi.delete(messId, id),
    onSuccess: invalidate,
  })
}

// Deposits
export function useMonthDeposits(messId: string, year: number, month: number) {
  return useQuery({
    queryKey: [...messKeys.month(messId, year, month), "deposits"],
    queryFn: () => depositApi.getMonth(messId, year, month),
    enabled: !!messId,
  })
}

export function useSaveDeposit(messId: string) {
  const invalidate = useInvalidateMess(messId)
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: DepositInput }) =>
      id ? depositApi.update(messId, id, data) : depositApi.create(messId, data),
    onSuccess: invalidate,
  })
}

export function useDeleteDeposit(messId: string) {
  const invalidate = useInvalidateMess(messId)
  return useMutation({
    mutationFn: (id: string) => depositApi.delete(messId, id),
    onSuccess: invalidate,
  })
}
