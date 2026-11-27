// Small shared building blocks used across mess pages
import type { LucideIcon } from "lucide-react"
import { ChevronLeft, ChevronRight, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/currency"
import { monthLabel, isCurrentMonth, useMonthStore } from "@/lib/month"

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function MonthSwitcher({ closed }: { closed?: boolean }) {
  const { year, month, shift, setMonth } = useMonthStore()
  const current = isCurrentMonth(year, month)

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
      <Button variant="ghost" size="icon-sm" onClick={() => shift(-1)} aria-label="Previous month">
        <ChevronLeft />
      </Button>
      <div className="flex min-w-36 items-center justify-center gap-1.5 px-1 text-sm font-medium">
        {closed && <Lock className="size-3.5 text-muted-foreground" aria-label="Closed" />}
        {monthLabel(year, month)}
      </div>
      <Button variant="ghost" size="icon-sm" onClick={() => shift(1)} aria-label="Next month">
        <ChevronRight />
      </Button>
      {!current && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const now = new Date()
            setMonth(now.getFullYear(), now.getMonth() + 1)
          }}
        >
          Today
        </Button>
      )}
    </div>
  )
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  loading,
  tone = "default",
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  loading?: boolean
  tone?: "default" | "meal" | "house" | "rent" | "fund"
}) {
  const tones = {
    default: "bg-muted text-foreground",
    meal: "bg-amber-100 text-amber-700",
    house: "bg-sky-100 text-sky-700",
    rent: "bg-violet-100 text-violet-700",
    fund: "bg-emerald-100 text-emerald-700",
  }
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className={cn("flex size-7 items-center justify-center rounded-md", tones[tone])}>
          <Icon className="size-4" />
        </span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="mt-2 text-xl font-semibold tabular-nums">
        {loading ? <Skeleton className="h-7 w-24" /> : value}
      </div>
      {hint && !loading && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

/** Balance with plain-language meaning: owes / gets back / settled */
export function Balance({ value, size = "sm" }: { value: number; size?: "sm" | "lg" }) {
  const rounded = Math.round(value)
  const cls = size === "lg" ? "text-2xl font-semibold" : "text-sm font-semibold"
  if (rounded === 0) return <span className={cn(cls, "text-muted-foreground")}>Settled</span>
  return rounded < 0 ? (
    <span className={cn(cls, "text-danger tabular-nums")}>Owes {formatCurrency(-value)}</span>
  ) : (
    <span className={cn(cls, "text-success tabular-nums")}>Gets back {formatCurrency(value)}</span>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </span>
      <p className="mt-3 font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ClosedNotice({ isManager }: { isManager: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
      <Lock className="mt-0.5 size-4 shrink-0" />
      <span>
        This month is closed, so meals and expenses are locked.
        {isManager && " Reopen it from the Overview page to make changes."}
      </span>
    </div>
  )
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

/** Native select: reliable on phones and keyboard-friendly */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      {...props}
    />
  )
}
