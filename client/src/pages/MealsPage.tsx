import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Minus, Plus, Save, UtensilsCrossed, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ClosedNotice, EmptyState, MonthSwitcher, PageHeader } from "@/components/common/ui-kit"
import { toast } from "@/components/common/toast"
import {
  useMembers,
  useMessContext,
  useMonthMeals,
  useMonthSummary,
  useSetMeals,
} from "@/features/mess/hooks/useMessData"
import { daysInMonth, dayOf, defaultDayFor, formatDay, weekdayOf } from "@/lib/month"
import { formatNumber, formatRate } from "@/lib/currency"
import { cn } from "@/lib/utils"
import type { MessMember } from "@/types/api"

const keyOf = (userId: string, date: string) => `${userId}|${date}`
const clamp = (n: number) => Math.max(0, Math.min(50, Math.round(n * 2) / 2))

/** Saved counts from the server + unsaved edits on top */
function useMealDraft(messId: string, year: number, month: number) {
  const { data: meals, isLoading } = useMonthMeals(messId, year, month)
  const setMeals = useSetMeals(messId)
  const [draft, setDraft] = useState<Record<string, number>>({})
  const [draftFor, setDraftFor] = useState(`${messId}|${year}|${month}`)

  // Drop unsaved edits when the month changes
  const scope = `${messId}|${year}|${month}`
  if (scope !== draftFor) {
    setDraftFor(scope)
    setDraft({})
  }

  const saved = useMemo(() => {
    const map: Record<string, number> = {}
    for (const m of meals ?? []) map[keyOf(m.userId, m.date)] = m.count
    return map
  }, [meals])

  const get = (userId: string, date: string) => {
    const k = keyOf(userId, date)
    return k in draft ? draft[k] : (saved[k] ?? 0)
  }

  const set = (userId: string, date: string, value: number) => {
    const k = keyOf(userId, date)
    const v = clamp(value)
    setDraft((d) => {
      const next = { ...d }
      if ((saved[k] ?? 0) === v) delete next[k]
      else next[k] = v
      return next
    })
  }

  const changes = Object.entries(draft).map(([k, count]) => {
    const [userId, date] = k.split("|")
    return { userId, date, count }
  })

  const save = (onlyDate?: string) => {
    const entries = onlyDate ? changes.filter((c) => c.date === onlyDate) : changes
    if (entries.length === 0) return
    setMeals.mutate(entries, {
      onSuccess: () => {
        setDraft((d) => {
          const next = { ...d }
          for (const e of entries) delete next[keyOf(e.userId, e.date)]
          return next
        })
        toast.success(`Saved ${entries.length} meal ${entries.length === 1 ? "entry" : "entries"}`)
      },
      onError: (e) => toast.error(e.message),
    })
  }

  return { isLoading, get, set, changes, save, discard: () => setDraft({}), saving: setMeals.isPending }
}

type Draft = ReturnType<typeof useMealDraft>

/** Number box that lets you type "1.5" without reformatting mid-typing */
function MealInput({ value, onChange, className, ...rest }: {
  value: number
  onChange: (v: number) => void
  className?: string
  "aria-label": string
  placeholder?: string
  blankZero?: boolean
}) {
  const [text, setText] = useState<string | null>(null)
  const { blankZero, ...inputProps } = rest
  const shown = text !== null && Number(text || 0) === value ? text : value === 0 && blankZero ? "" : formatNumber(value)
  return (
    <input
      inputMode="decimal"
      className={className}
      value={shown}
      onChange={(e) => {
        const raw = e.target.value.replace(",", ".")
        if (!/^\d*\.?\d*$/.test(raw)) return
        setText(raw)
        onChange(raw === "" || raw === "." ? 0 : Number(raw))
      }}
      onFocus={(e) => e.target.select()}
      onBlur={() => setText(null)}
      {...inputProps}
    />
  )
}

function Stepper({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" disabled={disabled || value <= 0} onClick={() => onChange(value - 1)} aria-label="One less meal">
        <Minus />
      </Button>
      <MealInput
        className="h-8 w-14 rounded-lg border border-input bg-transparent text-center tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        value={value}
        onChange={onChange}
        aria-label="Meals"
      />
      <Button variant="outline" size="icon" disabled={disabled} onClick={() => onChange(value + 1)} aria-label="One more meal">
        <Plus />
      </Button>
    </div>
  )
}

function DailyView({ members, draft, year, month, editable }: {
  members: MessMember[]
  draft: Draft
  year: number
  month: number
  editable: boolean
}) {
  const [date, setDate] = useState(() => defaultDayFor(year, month))
  const [dateFor, setDateFor] = useState(`${year}-${month}`)
  if (`${year}-${month}` !== dateFor) {
    setDateFor(`${year}-${month}`)
    setDate(defaultDayFor(year, month))
  }

  const day = Number(date.slice(8, 10))
  const last = daysInMonth(year, month)
  const total = members.reduce((s, m) => s + draft.get(m.user.id, date), 0)
  const pending = draft.changes.filter((c) => c.date === date).length

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" disabled={day <= 1} onClick={() => setDate(dayOf(year, month, day - 1))} aria-label="Previous day">
            <ChevronLeft />
          </Button>
          <Input
            type="date"
            className="h-8 w-40"
            value={date}
            min={dayOf(year, month, 1)}
            max={dayOf(year, month, last)}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
          <Button variant="ghost" size="icon-sm" disabled={day >= last} onClick={() => setDate(dayOf(year, month, day + 1))} aria-label="Next day">
            <ChevronRight />
          </Button>
        </div>
        {editable && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            Everyone:
            {[0, 1, 2, 3].map((n) => (
              <Button key={n} variant="outline" size="xs" onClick={() => members.forEach((m) => draft.set(m.user.id, date, n))}>
                {n}
              </Button>
            ))}
          </div>
        )}
      </div>

      <ul className="divide-y">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="min-w-0 truncate font-medium">{m.user.name}</span>
            {editable ? (
              <Stepper value={draft.get(m.user.id, date)} onChange={(v) => draft.set(m.user.id, date, v)} />
            ) : (
              <span className="tabular-nums">{formatNumber(draft.get(m.user.id, date))}</span>
            )}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {formatDay(date)} ({weekdayOf(date)}) · <b className="text-foreground">{formatNumber(total)}</b> meals
        </span>
        {editable && (
          <Button disabled={pending === 0 || draft.saving} onClick={() => draft.save(date)}>
            <Save /> {draft.saving ? "Saving..." : "Save day"}
          </Button>
        )}
      </div>
    </div>
  )
}

function MonthSheet({ members, draft, year, month, editable }: {
  members: MessMember[]
  draft: Draft
  year: number
  month: number
  editable: boolean
}) {
  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => dayOf(year, month, i + 1))
  const dayTotal = (date: string) => members.reduce((s, m) => s + draft.get(m.user.id, date), 0)
  const memberTotal = (userId: string) => days.reduce((s, d) => s + draft.get(userId, d), 0)

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="sticky left-0 z-10 border-b bg-card px-3 py-2 text-left font-medium shadow-[4px_0_6px_-4px_rgb(0_0_0/0.12)]">Member</th>
              {days.map((d) => (
                <th key={d} className="border-b px-0.5 py-1 text-center font-medium">
                  <div>{Number(d.slice(8))}</div>
                  <div className="text-[10px] font-normal">{weekdayOf(d).slice(0, 2)}</div>
                </th>
              ))}
              <th className="sticky right-0 border-b bg-card px-3 py-2 text-right font-medium border-l shadow-[-4px_0_6px_-4px_rgb(0_0_0/0.12)]">Total</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td className="sticky left-0 z-10 border-b bg-card px-3 py-1 font-medium whitespace-nowrap shadow-[4px_0_6px_-4px_rgb(0_0_0/0.12)]">{m.user.name}</td>
                {days.map((d) => {
                  const v = draft.get(m.user.id, d)
                  const dirty = draft.changes.some((c) => c.userId === m.user.id && c.date === d)
                  return (
                    <td key={d} className="border-b px-0.5 py-1">
                      {editable ? (
                        <MealInput
                          aria-label={`${m.user.name}, ${formatDay(d)}`}
                          className={cn(
                            "h-8 w-9 rounded-md border border-transparent text-center tabular-nums outline-none hover:border-input focus:border-ring focus:ring-2 focus:ring-ring/30",
                            dirty && "border-amber-300 bg-amber-50"
                          )}
                          value={v}
                          blankZero
                          placeholder="·"
                          onChange={(n) => draft.set(m.user.id, d, n)}
                        />
                      ) : (
                        <div className={cn("w-9 text-center tabular-nums", v === 0 && "text-muted-foreground/40")}>
                          {v === 0 ? "·" : formatNumber(v)}
                        </div>
                      )}
                    </td>
                  )
                })}
                <td className="sticky right-0 border-b bg-card px-3 py-1 text-right font-semibold tabular-nums border-l shadow-[-4px_0_6px_-4px_rgb(0_0_0/0.12)]">
                  {formatNumber(memberTotal(m.user.id))}
                </td>
              </tr>
            ))}
            <tr className="text-xs text-muted-foreground">
              <td className="sticky left-0 z-10 bg-muted px-3 py-2 font-medium shadow-[4px_0_6px_-4px_rgb(0_0_0/0.12)]">Day total</td>
              {days.map((d) => (
                <td key={d} className="bg-muted/60 text-center tabular-nums">
                  {dayTotal(d) ? formatNumber(dayTotal(d)) : ""}
                </td>
              ))}
              <td className="sticky right-0 bg-muted px-3 py-2 text-right font-semibold text-foreground tabular-nums border-l shadow-[-4px_0_6px_-4px_rgb(0_0_0/0.12)]">
                {formatNumber(days.reduce((s, d) => s + dayTotal(d), 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function MealsPage() {
  const { messId, year, month, isManager } = useMessContext()
  const { data: members, isLoading: membersLoading } = useMembers(messId)
  const { data: summary } = useMonthSummary(messId, year, month)
  const draft = useMealDraft(messId, year, month)
  const [view, setView] = useState<"daily" | "sheet">("daily")

  const closed = summary?.status === "CLOSED"
  const editable = isManager && !closed
  const loading = membersLoading || draft.isLoading

  return (
    <>
      <PageHeader
        title="Meals"
        description={
          summary
            ? `${formatNumber(summary.totals.totalMeals)} meals this month · meal rate ${formatRate(summary.totals.mealRate)}`
            : "Meals eaten per member per day"
        }
        actions={<MonthSwitcher closed={closed} />}
      />

      {closed && <ClosedNotice isManager={isManager} />}
      {!isManager && !closed && (
        <p className="text-sm text-muted-foreground">Only the manager can enter meals. Ask them if something looks wrong.</p>
      )}

      <div className="inline-flex rounded-lg bg-muted p-1 text-sm">
        {(["daily", "sheet"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium transition-colors",
              view === v ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {v === "daily" ? "Daily entry" : "Month sheet"}
          </button>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : !members?.length ? (
        <EmptyState icon={UtensilsCrossed} title="No members yet" description="Invite members first, then enter their meals here." />
      ) : view === "daily" ? (
        <DailyView members={members} draft={draft} year={year} month={month} editable={editable} />
      ) : (
        <MonthSheet members={members} draft={draft} year={year} month={month} editable={editable} />
      )}

      {editable && view === "sheet" && draft.changes.length > 0 && (
        <div className="sticky bottom-20 z-30 flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg md:bottom-4">
          <span className="text-sm">
            <b>{draft.changes.length}</b> unsaved {draft.changes.length === 1 ? "change" : "changes"}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={draft.discard}>
              <Undo2 /> Discard
            </Button>
            <Button disabled={draft.saving} onClick={() => draft.save()}>
              <Save /> {draft.saving ? "Saving..." : "Save all"}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
