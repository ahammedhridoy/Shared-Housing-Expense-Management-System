import { useState, useMemo } from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { messApi } from "@/services"
import { useAuth } from "@/hooks/useAuth"
import { usePayments, useCreatePayment, useUpdatePaymentStatus, useDeletePayment } from "@/features/payments/hooks/usePayments"
import { createPaymentSchema, type CreatePaymentFormData, updatePaymentSchema, type UpdatePaymentFormData } from "@/features/payments/validations/payment.schema"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Banknote, Trash2, Pencil } from "lucide-react"
import { formatCurrency } from "@/lib/currency"

const methods = ["CASH", "BANK", "MOBILE_BANKING", "OTHER"]
const methodLabels: Record<string, string> = {
  CASH: "Cash",
  BANK: "Bank Transfer",
  MOBILE_BANKING: "Mobile Banking",
  OTHER: "Other",
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

interface PaymentWithUser {
  id: string; messId: string; userId: string; recordedBy: string
  amount: number; date: string; method: string; note: string | null
  createdAt: string; updatedAt: string
  user: { id: string; name: string; email: string }
  recorder: { id: string; name: string; email: string }
}

export default function PaymentsPage() {
  const { messId } = useParams<{ messId: string }>()
  const { user } = useAuth()
  const mid = messId!
  const [open, setOpen] = useState(false)
  const [editPayment, setEditPayment] = useState<PaymentWithUser | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [detailPayment, setDetailPayment] = useState<PaymentWithUser | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [payerSearch, setPayerSearch] = useState("")
  const [payerDropdownOpen, setPayerDropdownOpen] = useState(false)

  const { data: membersData } = useQuery({
    queryKey: ["mess-members", mid],
    queryFn: () => messApi.getMembers(mid),
    enabled: !!mid,
  })

  const members = membersData?.members ?? []
  const isManager = members.some((m) => m.user.id === user?.id && m.role === "MANAGER")

  const filteredMembers = useMemo(() => {
    if (!payerSearch) return members
    const q = payerSearch.toLowerCase()
    return members.filter(
      (m) =>
        m.user.name.toLowerCase().includes(q) ||
        m.user.email.toLowerCase().includes(q)
    )
  }, [members, payerSearch])

  const { data, isLoading } = usePayments(mid)
  const create = useCreatePayment(mid)
  const updateStatus = useUpdatePaymentStatus(mid)
  const del = useDeletePayment(mid)

  const payments: PaymentWithUser[] = (data?.payments as PaymentWithUser[]) ?? []

  // Create form
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CreatePaymentFormData>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: { payerId: "", amount: 0, date: new Date().toISOString().split("T")[0], method: "CASH", note: "" },
  })

  // Edit form
  const { register: rEdit, handleSubmit: hEdit, reset: resetEdit, setValue: setEditVal, watch: wEdit, formState: { errors: eErrors } } = useForm<UpdatePaymentFormData>({
    resolver: zodResolver(updatePaymentSchema),
  })

  function openEdit(p: PaymentWithUser) {
    setEditPayment(p)
    resetEdit({ amount: p.amount, method: p.method, note: p.note || "" })
    setEditOpen(true)
  }

  function onCreateSubmit(data: CreatePaymentFormData) {
    create.mutate({ payerId: data.payerId, amount: data.amount, date: data.date, method: data.method, note: data.note || undefined }, {
      onSuccess: () => { reset(); setOpen(false) },
    })
  }

  function onEditSubmit(data: UpdatePaymentFormData) {
    if (!editPayment) return
    updateStatus.mutate({ paymentId: editPayment.id, data: { amount: data.amount, method: data.method, note: data.note || undefined } }, {
      onSuccess: () => { resetEdit(); setEditPayment(null); setEditOpen(false) },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Payments</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2"><Plus className="h-4 w-4" />Record Payment</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Payer</Label>
                <div className="relative">
                  <Input
                    placeholder="Search by name or email..."
                    value={payerSearch || members.find((m) => m.user.id === watch("payerId"))?.user.email || ""}
                    onChange={(e) => {
                      setPayerSearch(e.target.value)
                      setPayerDropdownOpen(true)
                      if (!e.target.value) setValue("payerId", "")
                    }}
                    onFocus={() => setPayerDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setPayerDropdownOpen(false), 150)}
                  />
                  {payerDropdownOpen && filteredMembers.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover p-1 shadow-md">
                      {filteredMembers.map((m) => (
                        <button
                          key={m.user.id}
                          type="button"
                          className={`flex w-full flex-col rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                            m.user.id === watch("payerId") ? "bg-accent" : ""
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setValue("payerId", m.user.id)
                            setPayerSearch("")
                            setPayerDropdownOpen(false)
                          }}
                        >
                          <span className="font-medium">{m.user.name}</span>
                          <span className="text-xs text-muted-foreground">{m.user.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {!watch("payerId") && <p className="text-xs text-destructive">Payer is required</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pay-amt">Amount</Label>
                  <Input id="pay-amt" type="number" min="1" {...register("amount", { valueAsNumber: true })} />
                  {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select value={watch("method")} onValueChange={(v) => v && setValue("method", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {methods.map((m) => <SelectItem key={m} value={m}>{methodLabels[m]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.method && <p className="text-xs text-destructive">{errors.method.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-date">Date</Label>
                <Input id="pay-date" type="date" {...register("date")} />
                {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-note">Note (optional)</Label>
                <Input id="pay-note" {...register("note")} placeholder="Optional note" />
                {errors.note && <p className="text-xs text-destructive">{errors.note.message}</p>}
              </div>
              {create.isError && <p className="text-sm text-danger">Failed to record payment.</p>}
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
              <Banknote className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">No payments recorded</p>
              <p className="text-xs text-muted-foreground mt-1">Record your first payment to get started</p>
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
                    <Banknote className="h-5 w-5 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{p.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {methodLabels[p.method] ?? p.method} &middot; {fmtDate(p.date)}
                      {p.note && <> &middot; {p.note}</>}
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
                      <button onClick={(e) => { e.stopPropagation(); del.mutate(p.id) }} className="rounded-md p-1 text-muted-foreground hover:text-danger transition-colors" title="Delete">
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
                <div><p className="text-xs text-muted-foreground">Method</p><p className="text-sm font-medium text-foreground">{methodLabels[detailPayment.method] ?? detailPayment.method}</p></div>
                <div><p className="text-xs text-muted-foreground">Date</p><p className="text-sm font-medium text-foreground">{fmtDate(detailPayment.date)}</p></div>
                <div><p className="text-xs text-muted-foreground">Recorded by</p><p className="text-sm font-medium text-foreground">{detailPayment.recorder.name}</p></div>
                {detailPayment.note && (
                  <div className="col-span-2"><p className="text-xs text-muted-foreground">Note</p><p className="text-sm text-foreground">{detailPayment.note}</p></div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-pay-amt">Amount</Label>
                <Input id="edit-pay-amt" type="number" min="1" {...rEdit("amount", { valueAsNumber: true })} />
                {eErrors.amount && <p className="text-xs text-destructive">{eErrors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={wEdit("method")} onValueChange={(v) => v && setEditVal("method", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {methods.map((m) => <SelectItem key={m} value={m}>{methodLabels[m]}</SelectItem>)}
                  </SelectContent>
                </Select>
                {eErrors.method && <p className="text-xs text-destructive">{eErrors.method.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pay-note">Note</Label>
              <Input id="edit-pay-note" {...rEdit("note")} />
              {eErrors.note && <p className="text-xs text-destructive">{eErrors.note.message}</p>}
            </div>
            {updateStatus.isError && <p className="text-sm text-danger">Failed to update payment.</p>}
            <Button type="submit" className="w-full" disabled={updateStatus.isPending}>{updateStatus.isPending ? "Updating..." : "Update Payment"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
