import { useState } from "react"
import { Link } from "react-router-dom"
import { Check, ChevronRight, Crown, Home, Mail, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Balance, EmptyState, PageHeader } from "@/components/common/ui-kit"
import { toast } from "@/components/common/toast"
import { useAuthStore } from "@/stores/auth.store"
import { useMessesThisMonth, useMyMesses } from "@/features/mess/hooks/useMess"
import { useAcceptInvitation, usePendingInvitations, useRejectInvitation } from "@/features/mess/hooks/useInvitation"
import { CreateMessDialog } from "@/components/common/CreateMessDialog"
import { formatCurrency, formatRate } from "@/lib/currency"
import { monthLabel } from "@/lib/month"

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const { data: messes, isLoading } = useMyMesses()
  const summaries = useMessesThisMonth(messes, year, month)
  const { data: invitations = [] } = usePendingInvitations()
  const accept = useAcceptInvitation()
  const reject = useRejectInvitation()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title={`Hi, ${user?.name?.split(" ")[0] ?? "there"}`}
        description={`Your accounts for ${monthLabel(year, month)}`}
      />

      {invitations.length > 0 && (
        <div className="rounded-xl border border-sky-200 bg-sky-50">
          <p className="flex items-center gap-2 border-b border-sky-200 px-4 py-3 font-medium text-sky-900">
            <Mail className="size-4" /> You've been invited
          </p>
          <ul className="divide-y divide-sky-200">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{inv.mess.name}</p>
                  <p className="text-xs text-muted-foreground">Invited by {inv.inviter.name}</p>
                </div>
                <Button
                  size="sm"
                  disabled={accept.isPending}
                  onClick={() =>
                    accept.mutate(inv.id, {
                      onSuccess: () => toast.success(`You joined ${inv.mess.name}`),
                      onError: (e) => toast.error(e.message),
                    })
                  }
                >
                  <Check /> Join
                </Button>
                <Button size="sm" variant="ghost" disabled={reject.isPending} onClick={() => reject.mutate(inv.id)} aria-label="Decline">
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-36 w-full rounded-xl" />
      ) : !messes?.length ? (
        <EmptyState
          icon={Home}
          title="You're not in a mess yet"
          description="Create one for your flat and invite your flatmates, or wait for an invitation from your manager."
          action={<Button onClick={() => setCreateOpen(true)}><Plus /> Create mess</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {messes.map((mess, i) => {
            const summary = summaries[i]?.data
            const me = summary?.members.find((m) => m.userId === user?.id)
            return (
              <Link key={mess.id} to={`/mess/${mess.id}`} className="group rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate font-semibold">
                      {mess.name}
                      {mess.role === "MANAGER" && <Crown className="size-3.5 text-amber-600" />}
                    </p>
                    <p className="text-xs text-muted-foreground">{mess.memberCount} members</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>

                <div className="mt-4">
                  {summaries[i]?.isLoading ? (
                    <Skeleton className="h-8 w-40" />
                  ) : me ? (
                    <Balance value={me.balance} size="lg" />
                  ) : (
                    <span className="text-sm text-muted-foreground">No activity yet</span>
                  )}
                </div>

                {summary && me && (
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Your bill</p>
                      <p className="font-semibold tabular-nums">{formatCurrency(me.totalCharge)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">You paid</p>
                      <p className="font-semibold tabular-nums">{formatCurrency(me.totalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Meal rate</p>
                      <p className="font-semibold tabular-nums">{formatRate(summary.totals.mealRate)}</p>
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}

      <CreateMessDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
