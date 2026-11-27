import { useState } from "react"
import { Pencil, Plus, Receipt, ShoppingBasket, Trash2, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ClosedNotice, EmptyState, Field, MonthSwitcher, NativeSelect, PageHeader } from "@/components/common/ui-kit"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { toast } from "@/components/common/toast"
import {
  useDeleteExpense,
  useMembers,
  useMessContext,
  useMonthExpenses,
  useMonthSummary,
  useSaveExpense,
} from "@/features/mess/hooks/useMessData"
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/currency"
import { dayOf, daysInMonth, defaultDayFor, formatDay } from "@/lib/month"
import { cn } from "@/lib/utils"
import type { Expense, ExpenseCategory, ExpenseKind, MessMember } from "@/types/api"

const HOUSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "ELECTRICITY", label: "Electricity" },
  { value: "GAS", label: "Gas" },
  { value: "WATER", label: "Water" },
  { value: "INTERNET", label: "Wifi / Internet" },
  { value: "MAID", label: "Maid (bua)" },
  { value: "SERVICE", label: "Service charge / repair" },
  { value: "OTHER", label: "Other" },
]
const categoryLabel = (c: ExpenseCategory) =>
  c === "BAZAR" ? "Bazar" : (HOUSE_CATEGORIES.find((x) => x.value === c)?.label ?? c)

const FUND = "__fund__"

interface FormState {
  kind: ExpenseKind
  category: ExpenseCategory
  title: string
  amount: string
  date: string
  paidBy: string
  custom: boolean
  shares: Record<string, string>
}

function ExpenseDialog({
  open,
  onOpenChange,
  editing,
  initialKind,
  members,
  year,
  month,
  messId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: Expense | null
  initialKind: ExpenseKind
  members: MessMember[]
  year: number
  month: number
  messId: string
}) {
  const save = useSaveExpense(messId)
  const blank = (): FormState => ({
    kind: initialKind,
    category: initialKind === "MEAL" ? "BAZAR" : "INTERNET",
    title: "",
    amount: "",
    date: defaultDayFor(year, month),
    paidBy: initialKind === "MEAL" && members[0] ? members[0].user.id : FUND,
    custom: false,
    shares: {},
  })
  const fromExpense = (e: Expense): FormState => ({
    kind: e.kind,
    category: e.category,
    title: e.title,
    amount: String(e.amount),
    date: e.date,
    paidBy: e.paidById ?? FUND,
    custom: e.shares.length > 0,
    shares: Object.fromEntries(e.shares.map((s) => [s.userId, String(s.amount)])),
  })

  const [form, setForm] = useState<FormState>(blank)
  const [error, setError] = useState("")
  const [openedFor, setOpenedFor] = useState<string | null>(null)
  const openKey = open ? (editing?.id ?? `new-${initialKind}`) : null
  if (openKey !== openedFor) {
    setOpenedFor(openKey)
    if (open) {
      setForm(editing ? fromExpense(editing) : blank())
      setError("")
    }
  }

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))
  const amount = Number(form.amount) || 0
  const shareTotal = Object.values(form.shares).reduce((s, v) => s + (Number(v) || 0), 0)
  const isHouse = form.kind === "HOUSE"

  const splitEqually = () => {
    const ids = members.map((m) => m.user.id)
    const each = Math.floor((amount / ids.length) * 100) / 100
    const shares: Record<string, string> = {}
    ids.forEach((id, i) => {
      shares[id] = String(i === ids.length - 1 ? Math.round((amount - each * (ids.length - 1)) * 100) / 100 : each)
    })
    update({ shares })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!form.title.trim()) return setError("Give it a short name, e.g. \"Weekly bazar\".")
    if (!(amount > 0)) return setError("Enter an amount greater than 0.")
    if (isHouse && form.custom && Math.abs(shareTotal - amount) > 0.01)
      return setError(`Shares add up to ${formatCurrency(shareTotal)} but the bill is ${formatCurrency(amount)}.`)

    save.mutate(
      {
        id: editing?.id,
        data: {
          kind: form.kind,
          category: form.kind === "MEAL" ? "BAZAR" : form.category,
          title: form.title.trim(),
          amount,
          date: form.date,
          paidById: form.paidBy === FUND ? null : form.paidBy,
          shares:
            isHouse && form.custom
              ? Object.entries(form.shares)
                  .map(([userId, v]) => ({ userId, amount: Number(v) || 0 }))
                  .filter((s) => s.amount > 0)
              : [],
        },
      },
      {
        onSuccess: () => {
          toast.success(editing ? "Expense updated" : "Expense added")
          onOpenChange(false)
        },
        onError: (err) => setError(err.message),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit expense" : isHouse ? "Add house bill" : "Add bazar"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
            {(["MEAL", "HOUSE"] as const).map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => update({ kind: k, category: k === "MEAL" ? "BAZAR" : "INTERNET" })}
                className={cn("rounded-md py-1.5 font-medium", form.kind === k ? "bg-card shadow-sm" : "text-muted-foreground")}
              >
                {k === "MEAL" ? "Bazar (meal cost)" : "House bill"}
              </button>
            ))}
          </div>

          {isHouse && (
            <Field label="Bill type" htmlFor="exp-cat">
              <NativeSelect id="exp-cat" value={form.category} onChange={(e) => update({ category: e.target.value as ExpenseCategory })}>
                {HOUSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </NativeSelect>
            </Field>
          )}

          <Field label="Name" htmlFor="exp-title">
            <Input id="exp-title" value={form.title} placeholder={isHouse ? "e.g. November wifi bill" : "e.g. Fish, rice, vegetables"} onChange={(e) => update({ title: e.target.value })} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={`Amount (${CURRENCY_SYMBOL})`} htmlFor="exp-amount">
              <Input id="exp-amount" inputMode="decimal" value={form.amount} onChange={(e) => update({ amount: e.target.value })} placeholder="0" />
            </Field>
            <Field label="Date" htmlFor="exp-date">
              <Input id="exp-date" type="date" value={form.date} min={dayOf(year, month, 1)} max={dayOf(year, month, daysInMonth(year, month))} onChange={(e) => update({ date: e.target.value })} />
            </Field>
          </div>

          <Field
            label="Who paid?"
            htmlFor="exp-paid"
            hint={form.paidBy === FUND ? "Paid by the manager from deposits." : "This amount is credited to that member."}
          >
            <NativeSelect id="exp-paid" value={form.paidBy} onChange={(e) => update({ paidBy: e.target.value })}>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
              ))}
              <option value={FUND}>Mess fund (from deposits)</option>
            </NativeSelect>
          </Field>

          {isHouse && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Split</p>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
                <button type="button" onClick={() => update({ custom: false })} className={cn("rounded-md py-1.5 font-medium", !form.custom ? "bg-card shadow-sm" : "text-muted-foreground")}>
                  Everyone equally
                </button>
                <button
                  type="button"
                  onClick={() => {
                    update({ custom: true })
                    if (Object.keys(form.shares).length === 0) splitEqually()
                  }}
                  className={cn("rounded-md py-1.5 font-medium", form.custom ? "bg-card shadow-sm" : "text-muted-foreground")}
                >
                  Custom amounts
                </button>
              </div>
              {form.custom ? (
                <div className="space-y-2 rounded-lg border p-3">
                  {members.map((m) => (
                    <div key={m.user.id} className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm">{m.user.name}</span>
                      <Input
                        className="w-28 text-right"
                        inputMode="decimal"
                        value={form.shares[m.user.id] ?? ""}
                        placeholder="0"
                        onChange={(e) => update({ shares: { ...form.shares, [m.user.id]: e.target.value } })}
                      />
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t pt-2 text-xs">
                    <button type="button" className="font-medium text-primary underline-offset-2 hover:underline" onClick={splitEqually}>
                      Reset to equal
                    </button>
                    <span className={cn(Math.abs(shareTotal - amount) > 0.01 ? "text-danger" : "text-muted-foreground")}>
                      {formatCurrency(shareTotal)} of {formatCurrency(amount)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Put 0 for anyone who shouldn't pay this bill.</p>
                </div>
              ) : (
                members.length > 0 &&
                amount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(amount / members.length)} each for {members.length} members.
                  </p>
                )
              )}
            </div>
          )}

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

function ExpenseList({
  items,
  editable,
  onEdit,
  onDelete,
  members,
}: {
  items: Expense[]
  editable: boolean
  onEdit: (e: Expense) => void
  onDelete: (e: Expense) => void
  members: MessMember[]
}) {
  const nameOf = (id: string) => members.find((m) => m.user.id === id)?.user.name ?? "Former member"
  return (
    <ul className="divide-y">
      {items.map((e) => (
        <li key={e.id} className="flex items-start gap-3 px-4 py-3">
          <div className="w-12 shrink-0 pt-0.5 text-xs text-muted-foreground">{formatDay(e.date)}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{e.title}</p>
            <p className="text-xs text-muted-foreground">
              {e.kind === "HOUSE" && <>{categoryLabel(e.category)} · </>}
              {e.paidBy ? `Paid by ${e.paidBy.name}` : "From mess fund"}
              {e.kind === "HOUSE" && (e.shares.length > 0 ? ` · custom split (${e.shares.map((s) => `${nameOf(s.userId)} ${formatCurrency(s.amount)}`).join(", ")})` : " · split equally")}
            </p>
          </div>
          <div className="text-right font-semibold tabular-nums">{formatCurrency(e.amount)}</div>
          {editable && (
            <div className="flex shrink-0 gap-0.5">
              <Button variant="ghost" size="icon-sm" onClick={() => onEdit(e)} aria-label="Edit">
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => onDelete(e)} aria-label="Delete">
                <Trash2 className="text-danger" />
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function ExpensesPage() {
  const { messId, year, month, isManager } = useMessContext()
  const { data: expenses, isLoading } = useMonthExpenses(messId, year, month)
  const { data: members = [] } = useMembers(messId)
  const { data: summary } = useMonthSummary(messId, year, month)
  const remove = useDeleteExpense(messId)

  const [tab, setTab] = useState<ExpenseKind>("MEAL")
  const [dialog, setDialog] = useState<{ open: boolean; editing: Expense | null }>({ open: false, editing: null })
  const [deleting, setDeleting] = useState<Expense | null>(null)

  const closed = summary?.status === "CLOSED"
  const editable = isManager && !closed
  const list = (expenses ?? []).filter((e) => e.kind === tab)
  const total = (kind: ExpenseKind) => (expenses ?? []).filter((e) => e.kind === kind).reduce((s, e) => s + e.amount, 0)

  return (
    <>
      <PageHeader
        title="Bazar & bills"
        description="Bazar sets the meal rate. House bills are shared separately."
        actions={
          <>
            <MonthSwitcher closed={closed} />
            {editable && (
              <Button onClick={() => setDialog({ open: true, editing: null })}>
                <Plus /> Add {tab === "MEAL" ? "bazar" : "bill"}
              </Button>
            )}
          </>
        }
      />

      {closed && <ClosedNotice isManager={isManager} />}

      <div className="grid grid-cols-2 gap-3">
        {(["MEAL", "HOUSE"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "rounded-xl border bg-card p-4 text-left transition-shadow",
              tab === k ? "ring-2 ring-primary" : "hover:shadow-sm"
            )}
          >
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              {k === "MEAL" ? <ShoppingBasket className="size-4 text-amber-600" /> : <Zap className="size-4 text-sky-600" />}
              {k === "MEAL" ? "Bazar (meal cost)" : "House bills"}
            </span>
            <span className="mt-1 block text-xl font-semibold tabular-nums">
              {isLoading ? <Skeleton className="h-7 w-20" /> : formatCurrency(total(k))}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Receipt}
              title={tab === "MEAL" ? "No bazar yet this month" : "No house bills yet this month"}
              description={tab === "MEAL" ? "Add each bazar with who paid for it." : "Add wifi, electricity, gas, water, maid and other shared bills."}
              action={editable && (
                <Button onClick={() => setDialog({ open: true, editing: null })}>
                  <Plus /> Add {tab === "MEAL" ? "bazar" : "bill"}
                </Button>
              )}
            />
          </div>
        ) : (
          <ExpenseList
            items={list}
            members={members}
            editable={editable}
            onEdit={(e) => setDialog({ open: true, editing: e })}
            onDelete={setDeleting}
          />
        )}
      </div>

      <ExpenseDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        editing={dialog.editing}
        initialKind={tab}
        members={members}
        year={year}
        month={month}
        messId={messId}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this expense?"
        description={deleting && `${deleting.title} — ${formatCurrency(deleting.amount)}. Everyone's account will be recalculated.`}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Expense deleted")
              setDeleting(null)
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </>
  )
}
