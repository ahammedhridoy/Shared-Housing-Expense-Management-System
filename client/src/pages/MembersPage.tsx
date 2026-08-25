import { useState } from "react"
import { useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAuth } from "@/hooks/useAuth"
import { useMembers, useSendInvite, useRemoveMember, usePendingInvitations, useCancelInvitation } from "@/features/members/hooks/useMembers"
import { inviteMemberSchema, type InviteMemberFormData } from "@/features/members/validations/invite-member.schema"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Users, Mail, Trash2, X } from "lucide-react"

const roleBadge: Record<string, string> = {
  MANAGER: "bg-info/10 text-info",
  MEMBER: "bg-muted text-muted-foreground",
}

export default function MembersPage() {
  const { messId } = useParams<{ messId: string }>()
  const { user } = useAuth()
  const mid = messId!
  const [inviteOpen, setInviteOpen] = useState(false)

  const { data: membersData, isLoading: membersLoading } = useMembers(mid)
  const { data: invitations, isLoading: invLoading } = usePendingInvitations(mid)
  const sendInvite = useSendInvite(mid)
  const removeMember = useRemoveMember(mid)
  const cancelInvitation = useCancelInvitation()

  const members = membersData?.members ?? []
  const pendingInvitations = invitations?.filter((inv) => inv.status === "PENDING") ?? []
  const isManager = members.some((m) => m.user.id === user?.id && m.role === "MANAGER")

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteMemberFormData>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "" },
  })

  function onSubmit(data: InviteMemberFormData) {
    sendInvite.mutate(data.email, {
      onSuccess: () => { reset(); setInviteOpen(false) },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Members</h1>
        {isManager && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger render={<Button className="gap-2"><Plus className="h-4 w-4" />Invite Member</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>Invite Member</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inv-email">Email</Label>
                  <Input id="inv-email" type="email" {...register("email")} placeholder="member@example.com" />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                {sendInvite.isError && <p className="text-sm text-danger">Failed to send invitation.</p>}
                <Button type="submit" className="w-full" disabled={sendInvite.isPending}>
                  {sendInvite.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Members */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Active Members</h2>
          </div>
          {membersLoading ? (
            <div className="divide-y">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div>
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">No members</p>
            </div>
          ) : (
            <div className="divide-y">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                    {m.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground">{m.user.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge[m.role] ?? "bg-muted text-muted-foreground"}`}>
                      {m.role}
                    </span>
                    {isManager && m.user.id !== user?.id && (
                      <button
                        onClick={() => removeMember.mutate(m.user.id)}
                        className="rounded-md p-1 text-muted-foreground hover:text-danger transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {isManager && (
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Pending Invitations</h2>
            </div>
            {invLoading ? (
              <div className="divide-y">
                {[1].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div>
                  </div>
                ))}
              </div>
            ) : pendingInvitations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Mail className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">No pending invitations</p>
              </div>
            ) : (
              <div className="divide-y">
                {pendingInvitations.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                      <Mail className="h-5 w-5 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">Sent {new Date(inv.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => cancelInvitation.mutate(inv.id)}
                      className="rounded-md p-1 text-muted-foreground hover:text-danger transition-colors"
                      title="Cancel invitation"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
