import { useState } from "react"
import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { billApi } from "@/services"
import type { MonthlyBill } from "@/types/api"
import type { BillSettlement } from "@/services/bill.service"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, ChevronLeft } from "lucide-react"
import { formatCurrency } from "@/lib/currency"

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]

const statusColor: Record<string, string> = {
  DRAFT: "bg-warning/10 text-warning",
  FINALIZED: "bg-success/10 text-success",
  SETTLED: "bg-info/10 text-info",
}

const settlementStatusColor: Record<string, string> = {
  UNPAID: "bg-danger/10 text-danger",
  PARTIAL: "bg-warning/10 text-warning",
  PAID: "bg-success/10 text-success",
}

export default function BillsPage() {
  const { messId } = useParams<{ messId: string }>()
  const qc = useQueryClient()

  const [selectedBill, setSelectedBill] = useState<MonthlyBill | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [year, setYear] = useState(String(new Date().getFullYear()))

  const { data, isLoading } = useQuery({
    queryKey: ["mess-bills", messId],
    queryFn: () => billApi.getAll(messId!),
    enabled: !!messId,
  })

  const { data: billDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["mess-bill-detail", messId, selectedBill?.month, selectedBill?.year],
    queryFn: () => billApi.getByMonth(messId!, selectedBill!.month, selectedBill!.year),
    enabled: !!messId && !!selectedBill,
  })

  const finalize = useMutation({
    mutationFn: () =>
      billApi.finalize(messId!, { month: parseInt(month), year: parseInt(year) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mess-bills", messId] })
      setDialogOpen(false)
      setMonth(String(new Date().getMonth() + 1))
      setYear(String(new Date().getFullYear()))
    },
  })

  const bills: MonthlyBill[] = (data?.bills as MonthlyBill[]) ?? []
  const settlements: BillSettlement[] = (billDetail as any)?.settlements ?? []

  if (selectedBill) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedBill(null)}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-semibold text-foreground">
            {monthNames[selectedBill.month - 1]} {selectedBill.year} Bill
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Meals</p>
              <p className="text-lg font-semibold text-foreground">
                {selectedBill.totalMeals}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Expense</p>
              <p className="text-lg font-semibold text-foreground">
                {formatCurrency(selectedBill.totalExpense)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Meal Rate</p>
              <p className="text-lg font-semibold text-foreground">
                {formatCurrency(selectedBill.mealRate)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Status</p>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  statusColor[selectedBill.status] ??
                  "bg-muted text-muted-foreground"
                }`}
              >
                {selectedBill.status}
              </span>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            {detailLoading ? (
              <div className="divide-y">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : settlements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">
                  No settlements
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Settlements will appear after finalization
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {settlements.map((s) => (
                  <div key={s.id} className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                      {s.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {s.user?.name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.mealCount} meals &middot; {formatCurrency(s.mealCost)} +{" "}
                        {formatCurrency(s.expenseShare)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(s.totalAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Paid: {formatCurrency(s.paidAmount)} &middot; Due:{" "}
                          {formatCurrency(s.dueAmount)}
                        </p>
                      </div>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          settlementStatusColor[s.status] ??
                          "bg-muted text-muted-foreground"
                        }`}
                      >
                        {s.status}
                      </span>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          Monthly Bills
        </h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button className="gap-2">Finalize Month</Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Finalize Month</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                finalize.mutate()
              }}
              className="space-y-4"
            >
              <div className="rounded-md bg-warning/10 p-3 text-sm text-warning flex items-start gap-2">
                <span>This will calculate settlements for all members based on their meals and expense shares.</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthNames.map((name, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-year">Year</Label>
                  <Input
                    id="bill-year"
                    type="number"
                    min="2020"
                    max="2099"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </div>
              </div>
              {finalize.isError && (
                <p className="text-sm text-danger">
                  Failed to finalize. Try again.
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={finalize.isPending}
              >
                {finalize.isPending ? "Finalizing..." : "Finalize"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">
                No bills generated
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Finalize a month to generate bills
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {bills.map((bill) => (
                <button
                  key={bill.id}
                  onClick={() => setSelectedBill(bill)}
                  className="flex w-full items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {monthNames[bill.month - 1]} {bill.year}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {bill.totalMeals} meals &middot; Meal rate{" "}
                      {formatCurrency(bill.mealRate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(bill.totalExpense)}
                    </span>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusColor[bill.status] ??
                        "bg-muted text-muted-foreground"
                      }`}
                    >
                      {bill.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
