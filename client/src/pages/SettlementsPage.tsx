import { useState } from "react"
import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { settlementApi } from "@/services"
import type { SettlementWithBill } from "@/services/settlement.service"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Receipt, CreditCard } from "lucide-react"
import { formatCurrency } from "@/lib/currency"

const months = ["January","February","March","April","May","June","July","August","September","October","November","December"]

const statusStyles: Record<string, string> = {
  PAID: "bg-success/10 text-success",
  PARTIAL: "bg-warning/10 text-warning",
  UNPAID: "bg-danger/10 text-danger",
}

export default function SettlementsPage() {
  const { messId } = useParams<{ messId: string }>()
  const qc = useQueryClient()
  const [payOpen, setPayOpen] = useState(false)
  const [activeSettlement, setActiveSettlement] = useState<SettlementWithBill | null>(null)
  const [payAmount, setPayAmount] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["my-settlements", messId],
    queryFn: () => settlementApi.getMy(messId!),
    enabled: !!messId,
  })

  const pay = useMutation({
    mutationFn: () => settlementApi.pay(messId!, activeSettlement!.id, { amount: parseFloat(payAmount) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-settlements", messId] })
      setPayOpen(false)
      setActiveSettlement(null)
      setPayAmount("")
    },
  })

  const settlements: SettlementWithBill[] = (data?.settlements as SettlementWithBill[]) ?? []

  function openPayDialog(s: SettlementWithBill) {
    setActiveSettlement(s)
    setPayAmount(String(s.dueAmount))
    setPayOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">My Settlements</h1>
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
          ) : settlements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">No settlements yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Settlements will appear once a bill is generated
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {settlements.map((s) => (
                <div key={s.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Receipt className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {months[s.bill.month - 1]} {s.bill.year}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Meal count: {s.mealCount} &middot; Rate: {formatCurrency(s.bill.mealRate)}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[s.status] ?? "bg-muted text-muted-foreground"}`}>
                      {s.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Meal Cost</p>
                      <p className="font-medium text-foreground">{formatCurrency(s.mealCost)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expense Share</p>
                      <p className="font-medium text-foreground">{formatCurrency(s.expenseShare)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-medium text-foreground">{formatCurrency(s.totalAmount)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Paid: <span className="font-medium text-foreground">{formatCurrency(s.paidAmount)}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Due: <span className="font-medium text-danger">{formatCurrency(s.dueAmount)}</span>
                      </span>
                    </div>
                    {s.dueAmount > 0 && (
                      <Button size="sm" className="gap-2" onClick={() => openPayDialog(s)}>
                        <CreditCard className="h-4 w-4" />
                        Pay
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make a Payment</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              pay.mutate()
            }}
            className="space-y-4"
          >
            {activeSettlement && (
              <p className="text-sm text-muted-foreground">
                {months[activeSettlement.bill.month - 1]} {activeSettlement.bill.year} &middot; Due: {formatCurrency(activeSettlement.dueAmount)}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount</Label>
              <Input
                id="pay-amount"
                type="number"
                min="1"
                max={activeSettlement?.dueAmount}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
              />
            </div>
            {pay.isError && (
              <p className="text-sm text-danger">Failed to process payment.</p>
            )}
            <Button type="submit" className="w-full" disabled={pay.isPending}>
              {pay.isPending ? "Processing..." : "Submit Payment"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
