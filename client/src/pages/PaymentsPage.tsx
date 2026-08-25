import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { messApi } from "@/services"
import { useAuth } from "@/hooks/useAuth"
import { usePayments, useCreatePayment, useUpdatePaymentStatus, useDeletePayment, useCreateCheckoutSession, useVerifyPayment } from "@/features/payments/hooks/usePayments"
import { createPaymentSchema, type CreatePaymentFormData, updatePaymentSchema, type UpdatePaymentFormData } from "@/features/payments/validations/payment.schema"
import { getStripe } from "@/lib/stripe"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, CreditCard, Trash2, Pencil, CheckCircle, XCircle } from "lucide-react"
import { formatCurrency } from "@/lib/currency"

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

interface PaymentWithUser {
  id: string; messId: string; userId: string; recordedBy: string | null
  stripeCheckoutId: string | null; amount: number; date: string; note: string | null
  createdAt: string; updatedAt: string
  user: { id: string; name: string; email: string }
  recorder: { id: string; name: string; email: string } | null
}

export default function PaymentsPage() {
  const { messId } = useParams<{ messId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const mid = messId!

  const [open, setOpen] = useState(false)
  const [editPayment, setEditPayment] = useState<PaymentWithUser | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [detailPayment, setDetailPayment] = useState<PaymentWithUser | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const sessionId = searchParams.get("session_id")
  const cancelParam = searchParams.get("canceled")

  const { data: membersData } = useQuery({
    queryKey: ["mess-members", mid],
    queryFn: () => messApi.getMembers(mid),
    enabled: !!mid,
  })

  const members = membersData?.members ?? []
  const isManager = members.some((m) => m.user.id === user?.id && m.role === "MANAGER")

  const { data, isLoading } = usePayments(mid)
  const create = useCreatePayment(mid)
  const updateStatus = useUpdatePaymentStatus(mid)
  const del = useDeletePayment(mid)
  const createCheckout = useCreateCheckoutSession(mid)
  const verifyPayment = useVerifyPayment()

  const payments: PaymentWithUser[] = (data?.payments as PaymentWithUser[]) ?? []

  // Auto-verify payment on redirect from Stripe
  useEffect(() => {
    if (sessionId && !verifyPayment.isPending) {
      verifyPayment.mutate(
        { sessionId },
        {
          onSuccess: () => {
            setSearchParams({}, { replace: true })
          },
          onError: () => {
            setSearchParams({}, { replace: true })
          },
        }
      )
    }
  }, [sessionId])

  // Create form (manual manager record)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreatePaymentFormData>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: { payerId: user?.id || "", amount: 0, date: new Date().toISOString().split("T")[0], note: "" },
  })

  // Edit form
  const { register: rEdit, handleSubmit: hEdit, reset: resetEdit, formState: { errors: eErrors } } = useForm<UpdatePaymentFormData>({
    resolver: zodResolver(updatePaymentSchema),
  })

  function openEdit(p: PaymentWithUser) {
    setEditPayment(p)
    resetEdit({ amount: p.amount, note: p.note || "" })
    setEditOpen(true)
  }

  function onCreateSubmit(data: CreatePaymentFormData) {
    create.mutate({ payerId: data.payerId, amount: data.amount, date: data.date, note: data.note || undefined }, {
      onSuccess: () => { reset(); setOpen(false) },
    })
  }

  function onEditSubmit(data: UpdatePaymentFormData) {
    if (!editPayment) return
    updateStatus.mutate({ paymentId: editPayment.id, data: { amount: data.amount, note: data.note || undefined } }, {
      onSuccess: () => { resetEdit(); setEditPayment(null); setEditOpen(false) },
    })
  }

  async function handleStripeCheckout() {
    const amountStr = prompt("Enter payment amount:")
    if (!amountStr) return
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount")
      return
    }
    const note = prompt("Note (optional):") || undefined
    try {
      const session = await createCheckout.mutateAsync({ amount, note })
      const stripe = await getStripe()
      await stripe?.redirectToCheckout({ sessionId: session.sessionId })
    } catch (err) {
      alert("Failed to create checkout session. Please try again.")
    }
  }

  const isVerifying = sessionId && verifyPayment.isPending
  const verifyFailed = sessionId && verifyPayment.isError

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Payments</h1>
        <div className="flex gap-2">
          <Button
            onClick={handleStripeCheckout}
            disabled={createCheckout.isPending}
            className="gap-2"
          >
            <CreditCard className="h-4 w-4" />
            {createCheckout.isPending ? "Redirecting..." : "Pay with Stripe"}
          </Button>
          {isManager && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button variant="outline" className="gap-2"><Plus className="h-4 w-4" />Record Manual</Button>} />
              <DialogContent>
                <DialogHeader><DialogTitle>Record Manual Payment</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pay-amt">Amount</Label>
                      <Input id="pay-amt" type="number" min="1" {...register("amount", { valueAsNumber: true })} />
                      {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pay-date">Date</Label>
                      <Input id="pay-date" type="date" {...register("date")} />
                      {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pay-note">Note (optional)</Label>
                    <Input id="pay-note" {...register("note")} placeholder="Optional note" />
                    {errors.note && <p className="text-xs text-destructive">{errors.note.message}</p>}
                  </div>
                  {create.isError && <p className="text-sm text-destructive">Failed to record payment.</p>}
                  <Button type="submit" className="w-full" disabled={create.isPending}>
                    {create.isPending ? "Recording..." : "Record Payment"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Verification status */}
      {isVerifying && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span className="text-sm text-blue-700 dark:text-blue-300">Verifying payment...</span>
          </CardContent>
        </Card>
      )}

      {verifyFailed && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardContent className="flex items-center gap-3 p-4">
            <XCircle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">Payment verification failed</p>
              <p className="text-xs text-red-600 dark:text-red-400">The payment may not have been completed. Please try again.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setSearchParams({}, { replace: true })}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">{[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}</div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CreditCard className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">No payments recorded</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Pay with Stripe" to make your first payment</p>
            </div>
          ) : (
            <div className="divide-y">
              {payments.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setDetailPayment(p); setDetailOpen(true) }}
                  className="flex w-full items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{p.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(p.date)}
                      {p.stripeCheckoutId && " · Paid via Stripe"}
                      {p.note && <> · {p.note}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(p.amount)}</span>
                    {isManager && (
                      <button onClick={(e) => { e.stopPropagation(); openEdit(p) }} className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {isManager && (
                      <button onClick={(e) => { e.stopPropagation(); del.mutate(p.id) }} className="rounded-md p-1 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Payment Details</DialogTitle></DialogHeader>
          {detailPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Payer</p><p className="text-sm font-medium text-foreground">{detailPayment.user.name}</p></div>
                <div><p className="text-xs text-muted-foreground">Amount</p><p className="text-sm font-medium text-foreground">{formatCurrency(detailPayment.amount)}</p></div>
                <div><p className="text-xs text-muted-foreground">Method</p><p className="text-sm font-medium text-foreground">{detailPayment.stripeCheckoutId ? "Stripe" : "Manual"}</p></div>
                <div><p className="text-xs text-muted-foreground">Date</p><p className="text-sm font-medium text-foreground">{fmtDate(detailPayment.date)}</p></div>
                {detailPayment.recorder && (
                  <div><p className="text-xs text-muted-foreground">Recorded by</p><p className="text-sm font-medium text-foreground">{detailPayment.recorder.name}</p></div>
                )}
                {detailPayment.note && (
                  <div className="col-span-2"><p className="text-xs text-muted-foreground">Note</p><p className="text-sm text-foreground">{detailPayment.note}</p></div>
                )}
                {detailPayment.stripeCheckoutId && (
                  <div className="col-span-2"><p className="text-xs text-muted-foreground">Stripe Session</p><p className="text-xs font-mono text-foreground break-all">{detailPayment.stripeCheckoutId}</p></div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Payment</DialogTitle></DialogHeader>
          <form onSubmit={hEdit(onEditSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-pay-amt">Amount</Label>
              <Input id="edit-pay-amt" type="number" min="1" {...rEdit("amount", { valueAsNumber: true })} />
              {eErrors.amount && <p className="text-xs text-destructive">{eErrors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pay-note">Note</Label>
              <Input id="edit-pay-note" {...rEdit("note")} />
              {eErrors.note && <p className="text-xs text-destructive">{eErrors.note.message}</p>}
            </div>
            {updateStatus.isError && <p className="text-sm text-destructive">Failed to update payment.</p>}
            <Button type="submit" className="w-full" disabled={updateStatus.isPending}>{updateStatus.isPending ? "Updating..." : "Update Payment"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
