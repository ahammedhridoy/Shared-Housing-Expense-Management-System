import { useState } from "react"
import { useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import { useMySettlements, usePaySettlement } from "@/features/settlements/hooks/useSettlements"
import { paySettlementSchema, type PaySettlementFormData } from "@/features/settlements/validations/pay-settlement.schema"
import type { SettlementWithBill } from "@/services/settlement.service"

const methods = ["CASH", "BANK", "MOBILE_BANKING", "OTHER"]
const methodLabels: Record<string, string> = {
  CASH: "Cash", BANK: "Bank Transfer", MOBILE_BANKING: "Mobile Banking", OTHER: "Other",
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

export default function SettlementsPage() {
  const { messId } = useParams<{ messId: string }>()
  const mid = messId!
  const [payOpen, setPayOpen] = useState(false)
  const [activeSettlement, setActiveSettlement] = useState<SettlementWithBill | null>(null)

  const { data, isLoading } = useMySettlements(mid)
  const pay = usePaySettlement(mid)

  const settlements: SettlementWithBill[] = data?.settlements ?? []

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<PaySettlementFormData>({
    resolver: zodResolver(paySettlementSchema),
    defaultValues: { amount: 0, method: "CASH" },
  })

  function openPayDialog(s: SettlementWithBill) {
    setActiveSettlement(s)
    reset({ amount: s.dueAmount, method: "CASH" })
    setPayOpen(true)
  }

  function onSubmit(data: PaySettlementFormData) {
    if (!activeSettlement) return
    pay.mutate({ settlementId: activeSettlement.id, data: { amount: data.amount, method: data.method } }, {
      onSuccess: () => { reset(); setActiveSettlement(null); setPayOpen(false) },
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Settlements</h1>

      <Card>
        <CardContent className="p-0">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">My Settlements</h2>
          </div>
          {isLoading ? (
            <div className="divide-y">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : settlements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-10 w-10 text-success mb-3" />
              <p className="text-sm font-medium text-foreground">All settled up</p>
              <p className="text-xs text-muted-foreground mt-1">No pending settlements</p>
            </div>
          ) : (
            <div className="divide-y">
              {settlements.map((s) => (
                <div key={s.id} className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                    <DollarSign className="h-5 w-5 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      Bill {s.bill.month}/{s.bill.year}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.mealCount} meals &middot; {fmtDate(s.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(s.totalAmount)}</p>
                      <p className="text-xs text-muted-foreground">Due: {formatCurrency(s.dueAmount)}</p>
                    </div>
                    {s.dueAmount > 0 && (
                      <Button size="sm" onClick={() => openPayDialog(s)}>Pay</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay Settlement Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pay Settlement</DialogTitle></DialogHeader>
          {activeSettlement && (
            <div className="mb-4 rounded-lg bg-muted p-3 text-sm">
              <p className="text-muted-foreground">Bill {activeSettlement.bill.month}/{activeSettlement.bill.year} &middot; Due: <strong className="text-foreground">{formatCurrency(activeSettlement.dueAmount)}</strong></p>
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount</Label>
              <Input id="pay-amount" type="number" min="1" {...register("amount", { valueAsNumber: true })} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={watch("method")} onValueChange={(v) => v && setValue("method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {methods.map((m) => <SelectItem key={m} value={m}>{methodLabels[m]}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.method && <p className="text-xs text-destructive">{errors.method.message}</p>}
            </div>
            {pay.isError && <p className="text-sm text-danger">Failed to process payment.</p>}
            <Button type="submit" className="w-full" disabled={pay.isPending}>{pay.isPending ? "Processing..." : "Pay Now"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
