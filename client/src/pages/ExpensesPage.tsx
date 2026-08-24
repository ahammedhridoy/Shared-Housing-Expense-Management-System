import { useState } from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { messApi } from "@/services"
import { useAuth } from "@/hooks/useAuth"
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from "@/features/expenses/hooks/useExpenses"
import { createExpenseSchema, type CreateExpenseFormData, updateExpenseSchema, type UpdateExpenseFormData } from "@/features/expenses/validations/expense.schema"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Receipt, Trash2, Pencil } from "lucide-react"
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
  const mid = messId!
  const [open, setOpen] = useState(false)
  const [editExpense, setEditExpense] = useState<ExpenseWithRecorder | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [detailExpense, setDetailExpense] = useState<ExpenseWithRecorder | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const { data, isLoading } = useExpenses(mid)

  const { data: membersData } = useQuery({
    queryKey: ["mess-members", mid],
    queryFn: () => messApi.getMembers(mid),
    enabled: !!mid,
  })

  const isManager = membersData?.members?.some((m) => m.user.id === user?.id && m.role === "MANAGER") ?? false

  const create = useCreateExpense(mid)
  const update = useUpdateExpense(mid)
  const del = useDeleteExpense(mid)

  const expenses: ExpenseWithRecorder[] = (data?.expenses as ExpenseWithRecorder[]) ?? []

  // Create form
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CreateExpenseFormData>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: { title: "", description: "", amount: 0, category: "FOOD", date: new Date().toISOString().split("T")[0] },
  })

  // Edit form
  const { register: rEdit, handleSubmit: hEdit, reset: resetEdit, setValue: setEditVal, watch: wEdit, formState: { errors: eErrors } } = useForm<UpdateExpenseFormData>({
    resolver: zodResolver(updateExpenseSchema),
  })

  function openEdit(ex: ExpenseWithRecorder) {
    setEditExpense(ex)
    resetEdit({ title: ex.title, description: ex.description || "", amount: ex.amount, category: ex.category })
    setEditOpen(true)
  }

  function onCreateSubmit(data: CreateExpenseFormData) {
    create.mutate({ title: data.title, description: data.description || undefined, amount: data.amount, category: data.category, date: data.date }, {
      onSuccess: () => { reset(); setOpen(false) },
    })
  }

  function onEditSubmit(data: UpdateExpenseFormData) {
    if (!editExpense) return
    update.mutate({ expenseId: editExpense.id, data: { title: data.title, description: data.description || undefined, amount: data.amount, category: data.category, date: editExpense.date } }, {
      onSuccess: () => { resetEdit(); setEditExpense(null); setEditOpen(false) },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Expenses</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2"><Plus className="h-4 w-4" />Add Expense</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exp-title">Title</Label>
                <Input id="exp-title" {...register("title")} placeholder="e.g. Groceries" />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp-desc">Description (optional)</Label>
                <Input id="exp-desc" {...register("description")} placeholder="Optional" />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exp-amt">Amount</Label>
                  <Input id="exp-amt" type="number" min="1" {...register("amount", { valueAsNumber: true })} />
                  {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={watch("category")} onValueChange={(v) => v && setValue("category", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp-date">Date</Label>
                <Input id="exp-date" type="date" {...register("date")} />
                {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
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
                <button
                  key={ex.id}
                  onClick={() => { setDetailExpense(ex); setDetailOpen(true) }}
                  className="flex w-full items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
                >
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
                      <button onClick={(e) => { e.stopPropagation(); openEdit(ex) }} className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {isManager && (
                      <button onClick={(e) => { e.stopPropagation(); del.mutate(ex.id) }} className="rounded-md p-1 text-muted-foreground hover:text-danger transition-colors" title="Delete">
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

      {/* Expense Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Expense Details</DialogTitle></DialogHeader>
          {detailExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Title</p>
                  <p className="text-sm font-medium text-foreground">{detailExpense.title}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-sm font-medium text-foreground">{formatCurrency(detailExpense.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm font-medium text-foreground">{detailExpense.category.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-medium text-foreground">{fmtDate(detailExpense.date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Recorded by</p>
                  <p className="text-sm font-medium text-foreground">{detailExpense.recorder.name}</p>
                </div>
                {detailExpense.description && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="text-sm text-foreground">{detailExpense.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Expense</DialogTitle></DialogHeader>
          <form onSubmit={hEdit(onEditSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-exp-title">Title</Label>
              <Input id="edit-exp-title" {...rEdit("title")} />
              {eErrors.title && <p className="text-xs text-destructive">{eErrors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-exp-desc">Description</Label>
              <Input id="edit-exp-desc" {...rEdit("description")} />
              {eErrors.description && <p className="text-xs text-destructive">{eErrors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-exp-amt">Amount</Label>
                <Input id="edit-exp-amt" type="number" min="1" {...rEdit("amount", { valueAsNumber: true })} />
                {eErrors.amount && <p className="text-xs text-destructive">{eErrors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={wEdit("category")} onValueChange={(v) => v && setEditVal("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
                {eErrors.category && <p className="text-xs text-destructive">{eErrors.category.message}</p>}
              </div>
            </div>
            {update.isError && <p className="text-sm text-danger">Failed to update expense.</p>}
            <Button type="submit" className="w-full" disabled={update.isPending}>{update.isPending ? "Updating..." : "Update Expense"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
