import { useState } from "react"
import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { expenseApi, messApi } from "@/services"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Receipt, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/currency"

const categories = ["FOOD","RENT","ELECTRICITY","GAS","WATER","INTERNET","MAINTENANCE","MAID_COST","OTHER"]

const catColors: Record<string, string> = {
  FOOD: "bg-success/10 text-success", RENT: "bg-info/10 text-info",
  ELECTRICITY: "bg-warning/10 text-warning", GAS: "bg-warning/10 text-warning",
  WATER: "bg-info/10 text-info", INTERNET: "bg-primary/10 text-primary",
  MAINTENANCE: "bg-danger/10 text-danger", MAID_COST: "bg-danger/10 text-danger",
  OTHER: "bg-muted text-muted-foreground",
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

interface ExpenseWithRecorder {
  id: string; messId: string; recordedBy: string; title: string; description: string | null
  amount: number; category: string; date: string; createdAt: string; updatedAt: string
  recorder: { id: string; name: string; email: string }
}

export default function ExpensesPage() {
  const { messId } = useParams<{ messId: string }>()
  const { user } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: "", description: "", amount: "", category: "FOOD", date: new Date().toISOString().split("T")[0] })

  const { data, isLoading } = useQuery({
    queryKey: ["mess-expenses", messId],
    queryFn: () => expenseApi.getAll(messId!),
    enabled: !!messId,
  })

  const { data: membersData } = useQuery({
    queryKey: ["mess-members", messId],
    queryFn: () => messApi.getMembers(messId!),
    enabled: !!messId,
  })

  const isManager = membersData?.members?.some((m) => m.user.id === user?.id && m.role === "MANAGER") ?? false

  const create = useMutation({
    mutationFn: () => expenseApi.create(messId!, { title: form.title, description: form.description || undefined, amount: parseFloat(form.amount), category: form.category, date: form.date }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mess-expenses", messId] }); setOpen(false); setForm({ title: "", description: "", amount: "", category: "FOOD", date: new Date().toISOString().split("T")[0] }) },
  })

  const del = useMutation({
    mutationFn: (id: string) => expenseApi.delete(messId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mess-expenses", messId] }),
  })

  const expenses: ExpenseWithRecorder[] = (data?.expenses as ExpenseWithRecorder[]) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Expenses</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2"><Plus className="h-4 w-4" />Add Expense</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate() }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exp-title">Title</Label>
                <Input id="exp-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Groceries" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp-desc">Description (optional)</Label>
                <Input id="exp-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exp-amt">Amount</Label>
                  <Input id="exp-amt" type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp-date">Date</Label>
                <Input id="exp-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              {create.isError && <p className="text-sm text-danger">Failed to add expense.</p>}
              <Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending ? "Adding..." : "Add Expense"}</Button>
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
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">No expenses recorded</p>
              <p className="text-xs text-muted-foreground mt-1">Add your first expense to get started</p>
            </div>
          ) : (
            <div className="divide-y">
              {expenses.map((ex) => (
                <div key={ex.id} className="flex items-center gap-4 p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${catColors[ex.category] ?? "bg-muted"}`}>
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{ex.title}</p>
                    <p className="text-xs text-muted-foreground">{ex.recorder.name} &middot; {fmtDate(ex.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(ex.amount)}</span>
                    {isManager && (
                      <button onClick={() => del.mutate(ex.id)} className="rounded-md p-1 text-muted-foreground hover:text-danger transition-colors" title="Delete">
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
