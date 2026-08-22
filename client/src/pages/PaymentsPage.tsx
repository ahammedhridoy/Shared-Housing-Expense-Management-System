import { useState, useMemo } from "react"
import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { paymentApi, messApi } from "@/services"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Banknote, Trash2 } from "lucide-react"
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
  id: string
  messId: string
  userId: string
  recordedBy: string
  amount: number
  date: string
  method: string
  note: string | null
  createdAt: string
  updatedAt: string
  user: { id: string; name: string; email: string }
  recorder: { id: string; name: string; email: string }
}

export default function PaymentsPage() {
  const { messId } = useParams<{ messId: string }>()
  const { user } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [payerSearch, setPayerSearch] = useState("")
  const [payerDropdownOpen, setPayerDropdownOpen] = useState(false)
  const [form, setForm] = useState({
    payerId: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    method: "CASH",
    note: "",
  })

  const { data: membersData } = useQuery({
    queryKey: ["mess-members", messId],
    queryFn: () => messApi.getMembers(messId!),
    enabled: !!messId,
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

  const { data, isLoading } = useQuery({
    queryKey: ["mess-payments", messId],
    queryFn: () => paymentApi.getAll(messId!),
    enabled: !!messId,
  })

  const create = useMutation({
    mutationFn: () =>
      paymentApi.create(messId!, {
        payerId: form.payerId,
        amount: parseFloat(form.amount),
        date: form.date,
        method: form.method,
        note: form.note || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mess-payments", messId] })
      setOpen(false)
      setForm({ payerId: "", amount: "", date: new Date().toISOString().split("T")[0], method: "CASH", note: "" })
    },
  })

  const del = useMutation({
    mutationFn: (id: string) => paymentApi.delete(messId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mess-payments", messId] }),
  })

  const payments: PaymentWithUser[] = (data?.payments as PaymentWithUser[]) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Payments</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Record Payment
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                create.mutate()
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Payer</Label>
                <div className="relative">
                  <Input
                    placeholder="Search by name or email..."
                    value={payerSearch || members.find((m) => m.user.id === form.payerId)?.user.email || ""}
                    onChange={(e) => {
                      setPayerSearch(e.target.value)
                      setPayerDropdownOpen(true)
                      if (!e.target.value) setForm({ ...form, payerId: "" })
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
                            m.user.id === form.payerId ? "bg-accent" : ""
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setForm({ ...form, payerId: m.user.id })
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pay-amt">Amount</Label>
                  <Input
                    id="pay-amt"
                    type="number"
                    min="1"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {methods.map((m) => (
                        <SelectItem key={m} value={m}>
                          {methodLabels[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-date">Date</Label>
                <Input
                  id="pay-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-note">Note (optional)</Label>
                <Input
                  id="pay-note"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Optional note"
                />
              </div>
              {create.isError && (
                <p className="text-sm text-danger">Failed to record payment.</p>
              )}
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
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Banknote className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">No payments recorded</p>
              <p className="text-xs text-muted-foreground mt-1">
                Record your first payment to get started
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                    <Banknote className="h-5 w-5 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {p.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {methodLabels[p.method] ?? p.method} &middot; {fmtDate(p.date)}
                      {p.note && <> &middot; {p.note}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(p.amount)}
                    </span>
                    {isManager && (
                      <button
                        onClick={() => del.mutate(p.id)}
                        className="rounded-md p-1 text-muted-foreground hover:text-danger transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
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
