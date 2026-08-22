import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { invitationApi } from "@/services"

export function usePendingInvitations() {
  return useQuery({
    queryKey: ["invitations", "pending"],
    queryFn: invitationApi.getMyPending,
  })
}

export function useMessInvitations(messId: string) {
  return useQuery({
    queryKey: ["invitations", "mess", messId],
    queryFn: () => invitationApi.getByMess(messId),
    enabled: !!messId,
  })
}

export function useSendInvitation(messId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (email: string) => invitationApi.send(messId, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations", "mess", messId] })
    },
  })
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invitationId: string) => invitationApi.accept(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations", "pending"] })
      queryClient.invalidateQueries({ queryKey: ["messes"] })
    },
  })
}

export function useCancelInvitation(messId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invitationId: string) => invitationApi.cancel(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations", "pending"] })
      if (messId) {
        queryClient.invalidateQueries({ queryKey: ["invitations", "mess", messId] })
      }
    },
  })
}

export function useRejectInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invitationId: string) => invitationApi.reject(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations", "pending"] })
    },
  })
}
