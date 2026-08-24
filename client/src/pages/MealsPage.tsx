import { useState, useMemo } from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { messApi } from "@/services"
import { useAuth } from "@/hooks/useAuth"
import { useMealsAll, useMealsMy, useLogMeal, useUpdateMeal, useDeleteMeal } from "@/features/meals/hooks/useMeals"
import { logMealSchema, type LogMealFormData } from "@/features/meals/validations/log-meal.schema"
import { updateMealSchema, type UpdateMealFormData } from "@/features/meals/validations/update-meal.schema"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Utensils, Trash2, Pencil } from "lucide-react"

const mealTypeLabels: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
}

const mealTypeColors: Record<string, string> = {
  BREAKFAST: "bg-warning/10 text-warning",
  LUNCH: "bg-info/10 text-info",
  DINNER: "bg-primary/10 text-primary",
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

interface MealWithUser {
  id: string; userId: string; messId: string; date: string
  type: "BREAKFAST" | "LUNCH" | "DINNER"; quantity: number
  createdAt: string; updatedAt: string
  user: { id: string; name: string; email: string }
}

export default function MealsPage() {
  const { messId } = useParams<{ messId: string }>()
  const { user } = useAuth()
  const [tab, setTab] = useState<"all" | "my">("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMeal, setEditMeal] = useState<MealWithUser | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Member selector state
  const [selectedUserId, setSelectedUserId] = useState("")
  const [memberSearch, setMemberSearch] = useState("")
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false)

  const mid = messId!

  // Fetch members for the user selector (managers pick who ate)
  const { data: membersData } = useQuery({
    queryKey: ["mess-members", mid],
    queryFn: () => messApi.getMembers(mid),
    enabled: !!mid,
  })

  const members = membersData?.members ?? []
  const isManager = members.some((m) => m.user.id === user?.id && m.role === "MANAGER")

  const filteredMembers = useMemo(() => {
    if (!memberSearch) return members
    const q = memberSearch.toLowerCase()
    return members.filter(
      (m) =>
        m.user.name.toLowerCase().includes(q) ||
        m.user.email.toLowerCase().includes(q)
    )
  }, [members, memberSearch])

  // Default selected user to current user when members load
  if (members.length > 0 && !selectedUserId && user) {
    const currentUserMember = members.find((m) => m.user.id === user.id)
    if (currentUserMember) {
      setSelectedUserId(currentUserMember.user.id)
    }
  }

  const { data: allData, isLoading: allLoading } = useMealsAll(mid)
  const { data: myData, isLoading: myLoading } = useMealsMy(mid)
  const logMeal = useLogMeal(mid)
  const updateMeal = useUpdateMeal(mid)
  const deleteMeal = useDeleteMeal(mid)

  const meals: MealWithUser[] = tab === "all"
    ? (allData?.meals as MealWithUser[]) ?? []
    : ((myData?.meals ?? []) as unknown as MealWithUser[])
  const isLoading = tab === "all" ? allLoading : myLoading

  // Log Meal form
  const {
    register,
    handleSubmit,
    reset: resetLogForm,
    setValue: setLogValue,
    watch: watchLog,
    formState: { errors: logErrors },
  } = useForm<LogMealFormData>({
    resolver: zodResolver(logMealSchema),
    defaultValues: { type: "LUNCH", quantity: 1, date: new Date().toISOString().split("T")[0] },
  })

  // Edit Meal form
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEditForm,
    formState: { errors: editErrors },
    setValue: setEditValue,
    watch: watchEdit,
  } = useForm<UpdateMealFormData>({
    resolver: zodResolver(updateMealSchema),
  })

  function openEditDialog(meal: MealWithUser) {
    setEditMeal(meal)
    resetEditForm({ type: meal.type, quantity: meal.quantity })
    setEditDialogOpen(true)
  }

  function onLogSubmit(data: LogMealFormData) {
    if (!selectedUserId) return
    logMeal.mutate(
      { userId: selectedUserId, date: data.date, type: data.type, quantity: data.quantity },
      {
        onSuccess: () => {
          resetLogForm({ type: "LUNCH", quantity: 1, date: new Date().toISOString().split("T")[0] })
          setSelectedUserId("")
          setDialogOpen(false)
        },
      }
    )
  }

  function onEditSubmit(data: UpdateMealFormData) {
    if (!editMeal) return
    updateMeal.mutate(
      { mealId: editMeal.id, data: { type: data.type, quantity: data.quantity } },
      {
        onSuccess: () => {
          resetEditForm()
          setEditMeal(null)
          setEditDialogOpen(false)
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Meals</h1>
        {isManager && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              render={
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Log Meal
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log a Meal</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onLogSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Member</Label>
                  <div className="relative">
                    <Input
                      placeholder="Search by name or email..."
                      value={memberSearch || members.find((m) => m.user.id === selectedUserId)?.user.email || ""}
                      onChange={(e) => {
                        setMemberSearch(e.target.value)
                        setMemberDropdownOpen(true)
                        if (!e.target.value) setSelectedUserId("")
                      }}
                      onFocus={() => setMemberDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setMemberDropdownOpen(false), 150)}
                    />
                    {memberDropdownOpen && filteredMembers.length > 0 && (
                      <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover p-1 shadow-md">
                        {filteredMembers.map((m) => (
                          <button
                            key={m.user.id}
                            type="button"
                            className={`flex w-full flex-col rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                              m.user.id === selectedUserId ? "bg-accent" : ""
                            }`}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setSelectedUserId(m.user.id)
                              setMemberSearch("")
                              setMemberDropdownOpen(false)
                            }}
                          >
                            <span className="font-medium">{m.user.name}</span>
                            <span className="text-xs text-muted-foreground">{m.user.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {!selectedUserId && (
                    <p className="text-xs text-destructive">Member is required</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Meal Type</Label>
                  <Select value={watchLog("type")} onValueChange={(v) => v && setLogValue("type", v as "BREAKFAST" | "LUNCH" | "DINNER")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BREAKFAST">Breakfast</SelectItem>
                      <SelectItem value="LUNCH">Lunch</SelectItem>
                      <SelectItem value="DINNER">Dinner</SelectItem>
                    </SelectContent>
                  </Select>
                  {logErrors.type && (
                    <p className="text-xs text-destructive">{logErrors.type.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0.5"
                    step="0.5"
                    {...register("quantity", { valueAsNumber: true })}
                    placeholder="e.g. 1"
                  />
                  {logErrors.quantity && (
                    <p className="text-xs text-destructive">{logErrors.quantity.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" {...register("date")} />
                  {logErrors.date && (
                    <p className="text-xs text-destructive">{logErrors.date.message}</p>
                  )}
                </div>
                {logMeal.isError && (
                  <p className="text-sm text-danger">
                    {(logMeal.error as Error)?.message || "Failed to log meal. Try again."}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={logMeal.isPending || !selectedUserId}
                >
                  {logMeal.isPending ? "Logging..." : "Log Meal"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setTab("all")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === "all"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All Meals
        </button>
        <button
          onClick={() => setTab("my")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === "my"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Meals
        </button>
      </div>

      {/* Meal List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : meals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Utensils className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">No meals logged</p>
              <p className="text-xs text-muted-foreground mt-1">
                {tab === "my" ? "Log your first meal to get started" : "No meals recorded yet"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {meals.map((meal) => (
                <div key={meal.id} className="flex items-center gap-4 p-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      mealTypeColors[meal.type] ?? "bg-muted"
                    }`}
                  >
                    <Utensils className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {mealTypeLabels[meal.type] ?? meal.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {"user" in meal && (meal as MealWithUser).user
                        ? (meal as MealWithUser).user.name
                        : formatDate(meal.date)}
                      {" · "}
                      {formatDate(meal.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      {meal.quantity}x
                    </span>
                    {isManager && (
                      <>
                        <button
                          onClick={() => openEditDialog(meal as MealWithUser)}
                          className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit meal"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteMeal.mutate(meal.id)}
                          className="rounded-md p-1 text-muted-foreground hover:text-danger transition-colors"
                          title="Delete meal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Meal Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Meal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Meal Type</Label>
              <Select value={watchEdit("type")} onValueChange={(v) => v && setEditValue("type", v as "BREAKFAST" | "LUNCH" | "DINNER")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BREAKFAST">Breakfast</SelectItem>
                  <SelectItem value="LUNCH">Lunch</SelectItem>
                  <SelectItem value="DINNER">Dinner</SelectItem>
                </SelectContent>
              </Select>
              {editErrors.type && (
                <p className="text-xs text-destructive">{editErrors.type.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantity</Label>
              <Input
                id="edit-quantity"
                type="number"
                min="0.5"
                step="0.5"
                {...registerEdit("quantity", { valueAsNumber: true })}
              />
              {editErrors.quantity && (
                <p className="text-xs text-destructive">{editErrors.quantity.message}</p>
              )}
            </div>
            {updateMeal.isError && (
              <p className="text-sm text-danger">Failed to update meal.</p>
            )}
            <Button type="submit" className="w-full" disabled={updateMeal.isPending}>
              {updateMeal.isPending ? "Updating..." : "Update Meal"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
