import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { messApi, invitationApi } from "@/services"

export function useMembers(messId: string) {
  return useQuery({
    queryKey: ["mess-members", messId],
    queryFn: () => messApi.getMembers(messId),
    enabled: !!messId,
  })
}

export function useMessDetail(messId: string) {
  return useQuery({
    queryKey: ["mess-detail", messId],
    queryFn: () => messApi.getById(messId),
    enabled: !!messId,
  })
}

export function useSendInvite(messId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => invitationApi.send(messId, email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mess-members", messId] })
      qc.invalidateQueries({ queryKey: ["mess-invitations", messId] })
    },
  })
}

export function useRemoveMember(messId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => messApi.removeMember(messId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mess-members", messId] })
    },
  })
}

export function usePendingInvitations(messId: string) {
  return useQuery({
    queryKey: ["mess-invitations", messId],
    queryFn: () => invitationApi.getByMess(messId),
    enabled: !!messId,
  })
}

export function useCancelInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) => invitationApi.cancel(invitationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mess-invitations"] })
    },
  })
}
