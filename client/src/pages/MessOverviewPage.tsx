import { useState } from "react"
import {
  Calculator,
  UtensilsCrossed,
  ShoppingBasket,
  Zap,
  BedDouble,
  Wallet,
  Lock,
  LockOpen,
  AlertTriangle,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Balance, MonthSwitcher, PageHeader, StatCard } from "@/components/common/ui-kit"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { toast } from "@/components/common/toast"
import { useAuthStore } from "@/stores/auth.store"
import { useCloseMonth, useMessContext, useMonthSummary, useReopenMonth } from "@/features/mess/hooks/useMessData"
import { formatCurrency, formatNumber, formatRate } from "@/lib/currency"
import { monthLabel } from "@/lib/month"
import type { MemberAccount, MonthSummary } from "@/types/api"
import { cn } from "@/lib/utils"

function Line({ label, sub, value, strong }: { label: string; sub?: string; value: number; strong?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 py-1.5", strong && "border-t pt-2.5 font-semibold")}>
      <span>
        {label}
        {sub && <span className="ml-1.5 text-xs text-muted-foreground">{sub}</span>}
      </span>
      <span className="tabular-nums">{formatCurrency(value)}</span>
    </div>
  )
}

function MyAccount({ me, rate }: { me: MemberAccount; rate: number }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Your account this month</p>
          <div className="mt-1">
            <Balance value={me.balance} size="lg" />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-6 text-sm sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">You owe</p>
          <Line label="Meals" sub={`${formatNumber(me.mealCount)} × ${formatRate(rate)}`} value={me.mealCost} />
          <Line label="Room rent" value={me.rent} />
          <Line label="House bills (your share)" value={me.houseShare} />
          <Line label="Total" value={me.totalCharge} strong />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">You paid</p>
          <Line label="Bazar / bills you paid" value={me.expenseCredit} />
          <Line label="Deposits to manager" value={me.deposit} />
          <Line label="Total" value={me.totalPaid} strong />
        </div>
      </div>
    </div>
  )
}

function MembersTable({ summary, myId }: { summary: MonthSummary; myId?: string }) {
  const rows = summary.members
  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <p className="font-medium">Everyone's account</p>
        <p className="text-xs text-muted-foreground">Negative balance = still owes. Positive = the mess owes them.</p>
      </div>

      {/* Phones: cards */}
      <ul className="divide-y md:hidden">
        {rows.map((m) => (
          <li key={m.userId} className={cn("px-4 py-3", m.userId === myId && "bg-muted/40")}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {m.name ?? "Unknown"}
                {!m.isMember && <span className="ml-1 text-xs text-muted-foreground">(left)</span>}
              </span>
              <Balance value={m.balance} />
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <span>Meals {formatNumber(m.mealCount)} · {formatCurrency(m.mealCost)}</span>
              <span>Rent {formatCurrency(m.rent)}</span>
              <span>Bills {formatCurrency(m.houseShare)}</span>
              <span className="col-span-3">
                Total {formatCurrency(m.totalCharge)} · Paid {formatCurrency(m.totalPaid)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr className="text-right [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
              <th className="text-left">Member</th>
              <th>Meals</th>
              <th>Meal cost</th>
              <th>Rent</th>
              <th>Bills</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y tabular-nums">
            {rows.map((m) => (
              <tr key={m.userId} className={cn("text-right [&>td]:px-3 [&>td]:py-2.5", m.userId === myId && "bg-muted/40")}>
                <td className="text-left font-medium">
                  {m.name ?? "Unknown"}
                  {!m.isMember && <span className="ml-1 text-xs font-normal text-muted-foreground">(left)</span>}
                </td>
                <td>{formatNumber(m.mealCount)}</td>
                <td>{formatCurrency(m.mealCost)}</td>
                <td>{formatCurrency(m.rent)}</td>
                <td>{formatCurrency(m.houseShare)}</td>
                <td className="font-medium">{formatCurrency(m.totalCharge)}</td>
                <td>{formatCurrency(m.totalPaid)}</td>
                <td>
                  <Balance value={m.balance} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function MessOverviewPage() {
  const { messId, year, month, mess, isManager } = useMessContext()
  const user = useAuthStore((s) => s.user)
  const { data: summary, isLoading } = useMonthSummary(messId, year, month)
  const closeMonth = useCloseMonth(messId)
  const reopenMonth = useReopenMonth(messId)
  const [confirm, setConfirm] = useState<"close" | "reopen" | null>(null)

  const closed = summary?.status === "CLOSED"
  const me = summary?.members.find((m) => m.userId === user?.id)
  const t = summary?.totals

  const runConfirm = () => {
    const mutation = confirm === "close" ? closeMonth : reopenMonth
    mutation.mutate(
      { year, month },
      {
        onSuccess: () => {
          toast.success(confirm === "close" ? "Month closed" : "Month reopened")
          setConfirm(null)
        },
        onError: (e) => toast.error(e.message),
      }
    )
  }

  return (
    <>
      <PageHeader
        title={mess?.name ?? "Overview"}
        description={closed ? "This month is closed and its charges are final." : "Live account — updates as meals, bazar and bills are added."}
        actions={
          <>
            <MonthSwitcher closed={closed} />
            {isManager && summary && (
              closed ? (
                <Button variant="outline" onClick={() => setConfirm("reopen")}>
                  <LockOpen /> Reopen
                </Button>
              ) : (
                <Button onClick={() => setConfirm("close")}>
                  <Lock /> Close month
                </Button>
              )
            )}
          </>
        }
      />

      {summary?.warnings.map((w) => (
        <div key={w} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {w}
        </div>
      ))}

      {isLoading ? (
        <Skeleton className="h-52 w-full rounded-xl" />
      ) : me ? (
        <MyAccount me={me} rate={t?.mealRate ?? 0} />
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          icon={Calculator}
          tone="meal"
          label="Meal rate"
          loading={isLoading}
          value={formatRate(t?.mealRate ?? 0)}
          hint={t && `${formatCurrency(t.mealExpense)} ÷ ${formatNumber(t.totalMeals)} meals`}
        />
        <StatCard icon={UtensilsCrossed} tone="meal" label="Total meals" loading={isLoading} value={formatNumber(t?.totalMeals ?? 0)} />
        <StatCard icon={ShoppingBasket} tone="meal" label="Bazar" loading={isLoading} value={formatCurrency(t?.mealExpense ?? 0)} />
        <StatCard icon={Zap} tone="house" label="House bills" loading={isLoading} value={formatCurrency(t?.houseExpense ?? 0)} hint="Wifi, current, gas, water, maid…" />
        <StatCard icon={BedDouble} tone="rent" label="Room rent" loading={isLoading} value={formatCurrency(t?.totalRent ?? 0)} />
      </div>

      {isManager && t && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border bg-card px-4 py-3 text-sm">
          <span className="flex items-center gap-2 font-medium">
            <Wallet className="size-4 text-emerald-600" /> Mess fund
          </span>
          <span>
            Deposits collected <b className="tabular-nums">{formatCurrency(t.totalDeposits)}</b>
          </span>
          {t.cashInHand !== undefined && (
            <>
              <span>
                Spent from fund <b className="tabular-nums">{formatCurrency(t.fundSpent ?? 0)}</b>
              </span>
              <span>
                Cash in hand <b className="tabular-nums">{formatCurrency(t.cashInHand)}</b>
                <span className="ml-1 text-xs text-muted-foreground">(includes rent to pay the landlord)</span>
              </span>
            </>
          )}
        </div>
      )}

      {summary && summary.members.length > 0 && <MembersTable summary={summary} myId={user?.id} />}

      <details className="rounded-xl border bg-card px-4 py-3 text-sm">
        <summary className="flex cursor-pointer items-center gap-2 font-medium">
          <Info className="size-4 text-muted-foreground" /> How is this calculated?
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li><b>Meal rate</b> = total bazar ÷ total meals. Each person pays their own meals × meal rate.</li>
          <li><b>Room rent</b> is each person's own rent (set on the Members page), so bigger rooms can pay more.</li>
          <li><b>House bills</b> (wifi, electricity, gas, water, maid…) are split equally, unless a bill has a custom split.</li>
          <li><b>Paid</b> = bazar or bills a person paid from their own pocket + money they deposited with the manager.</li>
          <li>Closing the month freezes the charges. Deposits can still be added later to settle dues.</li>
        </ul>
      </details>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "close" ? `Close ${monthLabel(year, month)}?` : `Reopen ${monthLabel(year, month)}?`}
        description={
          confirm === "close"
            ? "Charges will be frozen and meals/expenses for this month will be locked. Deposits can still be recorded. You can reopen it later."
            : "Meals and expenses become editable again and the account is recalculated live."
        }
        confirmLabel={confirm === "close" ? "Close month" : "Reopen"}
        loading={closeMonth.isPending || reopenMonth.isPending}
        onConfirm={runConfirm}
      />
    </>
  )
}
