import { useNavigate } from "react-router-dom"
import { ChevronRight, History } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Balance, EmptyState, PageHeader } from "@/components/common/ui-kit"
import { useClosedMonths, useMessContext } from "@/features/mess/hooks/useMessData"
import { formatCurrency, formatNumber, formatRate } from "@/lib/currency"
import { monthLabel, useMonthStore } from "@/lib/month"

export default function HistoryPage() {
  const { messId } = useMessContext()
  const { data: months, isLoading } = useClosedMonths(messId)
  const setMonth = useMonthStore((s) => s.setMonth)
  const navigate = useNavigate()

  return (
    <>
      <PageHeader title="History" description="Closed months. Tap one to see its full account." />

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : !months?.length ? (
        <EmptyState
          icon={History}
          title="No closed months yet"
          description="When the manager closes a month on the Overview page, it shows up here."
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {months.map((m) => (
            <li key={`${m.year}-${m.month}`}>
              <button
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
                onClick={() => {
                  setMonth(m.year, m.month)
                  navigate(`/mess/${messId}`)
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{monthLabel(m.year, m.month)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(m.totalMeals)} meals · rate {formatRate(m.mealRate)} · mess total {formatCurrency(m.totalCharge)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Your bill {formatCurrency(m.myCharge)}</p>
                  <Balance value={m.myBalance} />
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
