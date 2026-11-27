import { useState } from "react"
import { BedDouble, Crown, Link as LinkIcon, Mail, MoreVertical, Plus, UserMinus, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState, Field, PageHeader } from "@/components/common/ui-kit"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { toast } from "@/components/common/toast"
import { useAuthStore } from "@/stores/auth.store"
import { useMembers, useMessContext, useRemoveMember, useUpdateMember } from "@/features/mess/hooks/useMessData"
import { useCancelInvitation, useMessInvitations, useSendInvitation } from "@/features/mess/hooks/useInvitation"
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/currency"
import type { MessMember } from "@/types/api"

function RentCell({ member, editable, messId }: { member: MessMember; editable: boolean; messId: string }) {
  const update = useUpdateMember(messId)
  const [value, setValue] = useState<string | null>(null)

  if (!editable) return <span className="font-semibold tabular-nums">{formatCurrency(member.rentAmount)}</span>

  const commit = () => {
    if (value === null) return
    const n = Number(value)
    if (Number.isNaN(n) || n < 0) {
      toast.error("Rent must be 0 or more")
      setValue(null)
      return
    }
    if (n === member.rentAmount) return setValue(null)
    update.mutate(
      { userId: member.user.id, rentAmount: n },
      {
        onSuccess: () => {
          toast.success(`${member.user.name}'s rent set to ${formatCurrency(n)}`)
          setValue(null)
        },
        onError: (e) => toast.error(e.message),
      }
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm text-muted-foreground">{CURRENCY_SYMBOL}</span>
      <Input
        inputMode="decimal"
        aria-label={`Room rent for ${member.user.name}`}
        className="h-8 w-24 text-right tabular-nums"
        value={value ?? String(member.rentAmount)}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        disabled={update.isPending}
      />
    </div>
  )
}

export default function MembersPage() {
  const { messId, isManager } = useMessContext()
  const user = useAuthStore((s) => s.user)
  const { data: members = [], isLoading } = useMembers(messId)
  const { data: invitations = [] } = useMessInvitations(isManager ? messId : "")
  const sendInvite = useSendInvitation(messId)
  const cancelInvite = useCancelInvitation(messId)
  const updateMember = useUpdateMember(messId)
  const removeMember = useRemoveMember(messId)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [inviteError, setInviteError] = useState("")
  const [removing, setRemoving] = useState<MessMember | null>(null)

  const pending = invitations.filter((i) => i.status === "PENDING")
  const totalRent = members.reduce((s, m) => s + m.rentAmount, 0)

  const invite = (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError("")
    if (!/^\S+@\S+\.\S+$/.test(email)) return setInviteError("Enter a valid email address.")
    sendInvite.mutate(email.trim(), {
      onSuccess: (inv) => {
        if (inv.emailSent) toast.success(`Invitation emailed to ${inv.email}`)
        else toast.success("Invitation created. Email couldn't be sent, so use \"Copy link\" to share it.")
        setEmail("")
        setInviteOpen(false)
      },
      onError: (err) => setInviteError(err.message),
    })
  }

  return (
    <>
      <PageHeader
        title="Members & rent"
        description="Each member's room rent is charged every month. Rooms can have different rents."
        actions={
          isManager && (
            <Button onClick={() => setInviteOpen(true)}>
              <Plus /> Invite member
            </Button>
          )
        }
      />

      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-medium">
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <BedDouble className="size-4" /> Total rent <b className="text-foreground tabular-nums">{formatCurrency(totalRent)}</b>
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : members.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Users} title="No members" />
          </div>
        ) : (
          <ul className="divide-y">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                  {m.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-medium">
                    {m.user.name}
                    {m.user.id === user?.id && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
                    {m.role === "MANAGER" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        <Crown className="size-3" /> Manager
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden text-xs text-muted-foreground sm:inline">Room rent</span>
                  <RentCell member={m} editable={isManager} messId={messId} />
                  {isManager && m.user.id !== user?.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More actions" />}>
                        <MoreVertical />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            updateMember.mutate(
                              { userId: m.user.id, role: m.role === "MANAGER" ? "MEMBER" : "MANAGER" },
                              {
                                onSuccess: () => toast.success(m.role === "MANAGER" ? `${m.user.name} is now a member` : `${m.user.name} is now a manager`),
                                onError: (e) => toast.error(e.message),
                              }
                            )
                          }
                        >
                          <Crown /> {m.role === "MANAGER" ? "Remove manager role" : "Make manager"}
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setRemoving(m)}>
                          <UserMinus /> Remove from mess
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isManager && pending.length > 0 && (
        <div className="rounded-xl border bg-card">
          <p className="border-b px-4 py-3 font-medium">Pending invitations</p>
          <ul className="divide-y">
            {pending.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                <Mail className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(inv.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                </div>
                {inv.inviteUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(inv.inviteUrl!)
                        toast.success("Invite link copied. Share it on WhatsApp or Messenger.")
                      } catch {
                        toast.error("Couldn't copy. Long-press the link to copy it instead.")
                      }
                    }}
                  >
                    <LinkIcon /> Copy link
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cancelInvite.mutate(inv.id, { onSuccess: () => toast.success("Invitation cancelled") })}
                >
                  <X /> Cancel
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a member</DialogTitle>
          </DialogHeader>
          <form onSubmit={invite} className="space-y-4">
            <Field label="Email" htmlFor="inv-email" error={inviteError} hint="We'll email them a link. They join by signing up or logging in with this email. The invite lasts 7 days.">
              <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="friend@example.com" />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={sendInvite.isPending}>{sendInvite.isPending ? "Sending..." : "Send invite"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.user.name}?`}
        description="They lose access to the mess. Their meals, payments and past months stay in the records, and they still appear in this month's account."
        confirmLabel="Remove"
        destructive
        loading={removeMember.isPending}
        onConfirm={() =>
          removing &&
          removeMember.mutate(removing.user.id, {
            onSuccess: () => {
              toast.success(`${removing.user.name} removed`)
              setRemoving(null)
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </>
  )
}
