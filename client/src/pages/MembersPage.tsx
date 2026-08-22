import { useState } from "react"
import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { messApi, invitationApi } from "@/services"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, UserPlus, Trash2 } from "lucide-react"

const roleBadge: Record<string, string> = {
  MANAGER: "bg-primary/10 text-primary",
  MEMBER: "bg-muted text-muted-foreground",
}

export default function MembersPage() {
  const { messId } = useParams<{ messId: string }>()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")

  const { data: mess, isLoading: messLoading } = useQuery({
    queryKey: ["mess-detail", messId],
    queryFn: () => messApi.getById(messId!),
    enabled: !!messId,
  })

  const isManager = mess?.membership?.role === "MANAGER"

  const { data, isLoading } = useQuery({
    queryKey: ["mess-members", messId],
    queryFn: () => messApi.getMembers(messId!),
    enabled: !!messId,
  })

  const sendInvite = useMutation({
    mutationFn: () => invitationApi.send(messId!, email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mess-members", messId] })
      setOpen(false)
      setEmail("")
    },
  })

  const removeMember = useMutation({
    mutationFn: (userId: string) => messApi.removeMember(messId!, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mess-members", messId] }),
  })

  const members = data?.members ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Members</h1>
        {!messLoading && isManager && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="gap-2"><UserPlus className="h-4 w-4" />Invite</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>Invite Member</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); sendInvite.mutate() }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="member@email.com"
                    required
                  />
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

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">No members yet</p>
              <p className="text-xs text-muted-foreground mt-1">Invite members to get started</p>
            </div>
          ) : (
            <div className="divide-y">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    {m.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground">{m.user.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge[m.role] ?? "bg-muted text-muted-foreground"}`}>
                      {m.role}
                    </span>
                    {isManager && m.role !== "MANAGER" && (
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
    </div>
  )
}
