import { useState } from "react"
import { Pencil, Plus, Trash2, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Balance, EmptyState, Field, MonthSwitcher, NativeSelect, PageHeader } from "@/components/common/ui-kit"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { toast } from "@/components/common/toast"
import {
  useDeleteDeposit,
  useMembers,
  useMessContext,
  useMonthDeposits,
  useMonthSummary,
  useSaveDeposit,
} from "@/features/mess/hooks/useMessData"
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/currency"
import { formatDay, monthLabel, todayDay } from "@/lib/month"
import type { Deposit, MemberAccount, MessMember, PaymentMethod } from "@/types/api"

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "BKASH", label: "bKash" },
  { value: "NAGAD", label: "Nagad" },
  { value: "ROCKET", label: "Rocket" },
  { value: "BANK", label: "Bank" },
  { value: "OTHER", label: "Other" },
]
const methodLabel = (m: PaymentMethod) => METHODS.find((x) => x.value === m)?.label ?? m

function DepositDialog({
  open,
  onOpenChange,
  editing,
  preset,
  members,
  messId,
  year,
  month,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: Deposit | null
  preset: { userId: string; amount: number } | null
  members: MessMember[]
  messId: string
  year: number
  month: number
}) {
  const save = useSaveDeposit(messId)
  const [form, setForm] = useState({ userId: "", amount: "", date: todayDay(), method: "CASH" as PaymentMethod, note: "" })
  const [error, setError] = useState("")
  const [openedFor, setOpenedFor] = useState<string | null>(null)
  const key = open ? (editing?.id ?? `new-${preset?.userId ?? ""}`) : null
  if (key !== openedFor) {
    setOpenedFor(key)
    if (open) {
      setError("")
      setForm(
        editing
          ? { userId: editing.userId, amount: String(editing.amount), date: editing.date, method: editing.method, note: editing.note ?? "" }
          : {
              userId: preset?.userId ?? members[0]?.user.id ?? "",
              amount: preset ? String(Math.round(preset.amount)) : "",
              date: todayDay(),
              method: "CASH",
              note: "",
            }
      )
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(form.amount)
    if (!form.userId) return setError("Choose who paid.")
    if (!(amount > 0)) return setError("Enter an amount greater than 0.")
    save.mutate(
      {
        id: editing?.id,
        data: { userId: form.userId, amount, date: form.date, method: form.method, note: form.note || null, month, year },
      },
      {
        onSuccess: () => {
          toast.success(editing ? "Deposit updated" : "Deposit recorded")
          onOpenChange(false)
        },
        onError: (err) => setError(err.message),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit deposit" : "Record a deposit"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Member" htmlFor="dep-user">
            <NativeSelect id="dep-user" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Amount (${CURRENCY_SYMBOL})`} htmlFor="dep-amount">
              <Input id="dep-amount" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
            </Field>
            <Field label="Received on" htmlFor="dep-date">
              <Input id="dep-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
          </div>
          <Field label="Method" htmlFor="dep-method">
            <NativeSelect id="dep-method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Note (optional)" htmlFor="dep-note">
            <Input id="dep-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. bKash TrxID" />
          </Field>
          <p className="text-xs text-muted-foreground">Counted towards {monthLabel(year, month)}.</p>
          {error && <p className="rounded-md bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function DepositsPage() {
  const { messId, year, month, isManager } = useMessContext()
  const { data: deposits, isLoading } = useMonthDeposits(messId, year, month)
  const { data: members = [] } = useMembers(messId)
  const { data: summary } = useMonthSummary(messId, year, month)
  const remove = useDeleteDeposit(messId)

  const [dialog, setDialog] = useState<{ open: boolean; editing: Deposit | null; preset: { userId: string; amount: number } | null }>({
    open: false,
    editing: null,
    preset: null,
  })
  const [deleting, setDeleting] = useState<Deposit | null>(null)

  const owing: MemberAccount[] = (summary?.members ?? []).filter((m) => Math.round(m.balance) < 0)
  const total = (deposits ?? []).reduce((s, d) => s + d.amount, 0)

  return (
    <>
      <PageHeader
        title="Deposits"
        description="Money members hand to the manager for this month."
        actions={
          <>
            <MonthSwitcher closed={summary?.status === "CLOSED"} />
            {isManager && (
              <Button onClick={() => setDialog({ open: true, editing: null, preset: null })}>
                <Plus /> Record deposit
              </Button>
            )}
          </>
        }
      />

      {owing.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <p className="font-medium">Still to collect</p>
            <p className="text-xs text-muted-foreground">Based on {monthLabel(year, month)}'s account so far.</p>
          </div>
          <ul className="divide-y">
            {owing.map((m) => (
              <li key={m.userId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="font-medium">{m.name}</span>
                <div className="flex items-center gap-3">
                  <Balance value={m.balance} />
                  {isManager && m.isMember && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDialog({ open: true, editing: null, preset: { userId: m.userId, amount: -m.balance } })}
                    >
                      Record
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-medium">Received</p>
          <p className="text-sm font-semibold tabular-nums">{formatCurrency(total)}</p>
        </div>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !deposits?.length ? (
          <div className="p-4">
            <EmptyState icon={Wallet} title="No deposits this month" description="When someone gives money to the manager, record it here." />
          </div>
        ) : (
          <ul className="divide-y">
            {deposits.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-12 shrink-0 text-xs text-muted-foreground">{formatDay(d.date)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{d.user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {methodLabel(d.method)}
                    {d.note && ` · ${d.note}`}
                  </p>
                </div>
                <div className="font-semibold tabular-nums">{formatCurrency(d.amount)}</div>
                {isManager && (
                  <div className="flex shrink-0 gap-0.5">
                    <Button variant="ghost" size="icon-sm" onClick={() => setDialog({ open: true, editing: d, preset: null })} aria-label="Edit">
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(d)} aria-label="Delete">
                      <Trash2 className="text-danger" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <DepositDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog((s) => ({ ...s, open: o }))}
        editing={dialog.editing}
        preset={dialog.preset}
        members={members}
        messId={messId}
        year={year}
        month={month}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this deposit?"
        description={deleting && `${deleting.user.name} — ${formatCurrency(deleting.amount)}`}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Deposit deleted")
              setDeleting(null)
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </>
  )
}
