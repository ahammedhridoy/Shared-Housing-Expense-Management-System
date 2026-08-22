import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { messApi, billApi } from "@/services"
import { useMess, useUpdateMess, useDeleteMess } from "@/features/mess/hooks/useMess"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, Receipt, MapPin, Calendar, Pencil, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/currency"

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export default function MessOverviewPage() {
  const { messId } = useParams<{ messId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", description: "", address: "" })

  const { data: mess, isLoading: messLoading } = useMess(messId!)
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["mess-members", messId],
    queryFn: () => messApi.getMembers(messId!),
    enabled: !!messId,
  })
  const { data: billsData, isLoading: billsLoading } = useQuery({
    queryKey: ["mess-bills", messId],
    queryFn: () => billApi.getAll(messId!),
    enabled: !!messId,
  })

  const updateMess = useUpdateMess(messId!)
  const deleteMess = useDeleteMess()

  const members = membersData?.members ?? []
  const bills = billsData?.bills ?? []
  const recentBills = bills.slice(0, 5)
  const isManager = members.some((m) => m.user.id === user?.id && m.role === "MANAGER")

  return (
    <div className="space-y-6">
      {/* Header with edit/delete for manager */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {messLoading ? <Skeleton className="h-7 w-48" /> : mess?.name}
          </h1>
          {mess?.description && (
            <p className="mt-1 text-sm text-muted-foreground">{mess.description}</p>
          )}
        </div>
        {isManager && (
          <div className="flex items-center gap-2">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger
                render={
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditForm({ name: mess?.name ?? "", description: mess?.description ?? "", address: mess?.address ?? "" })
                  }} />
                }
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Mess</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    updateMess.mutate(editForm, { onSuccess: () => setEditOpen(false) })
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-desc">Description</Label>
                    <Input
                      id="edit-desc"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-addr">Address</Label>
                    <Input
                      id="edit-addr"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    />
                  </div>
                  <Button type="submit" disabled={updateMess.isPending}>
                    {updateMess.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger render={<Button variant="destructive" size="sm" />}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Mess</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete <strong>{mess?.name}</strong>? This will permanently remove all members, meals, expenses, payments, and bills. This action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  disabled={deleteMess.isPending}
                  onClick={() => {
                    deleteMess.mutate(messId!, {
                      onSuccess: () => {
                        setDeleteOpen(false)
                        navigate("/mess")
                      },
                    })
                  }}
                >
                  {deleteMess.isPending ? "Deleting..." : "Yes, Delete Mess"}
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">
                {membersLoading ? <Skeleton className="h-6 w-8 inline-block" /> : members.length}
              </p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
              <Receipt className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">
                {billsLoading ? <Skeleton className="h-6 w-8 inline-block" /> : bills.length}
              </p>
              <p className="text-xs text-muted-foreground">Total Bills</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <MapPin className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground truncate max-w-[140px]">
                {messLoading ? (
                  <Skeleton className="h-5 w-24 inline-block" />
                ) : mess?.address || "No address set"}
              </p>
              <p className="text-xs text-muted-foreground">Address</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Members</CardTitle>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members found.</p>
            ) : (
              <div className="space-y-3">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                      {m.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {m.user.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.user.email}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        m.role === "MANAGER"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bills */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Bills</CardTitle>
          </CardHeader>
          <CardContent>
            {billsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : recentBills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bills generated yet.</p>
            ) : (
              <div className="space-y-3">
                {recentBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {monthNames[bill.month - 1]} {bill.year}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {bill.totalMeals} meals
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(bill.totalExpense)}
                      </p>
                      <p
                        className={`text-xs font-medium ${
                          bill.status === "FINALIZED"
                            ? "text-success"
                            : bill.status === "PAID"
                            ? "text-muted-foreground"
                            : "text-warning"
                        }`}
                      >
                        {bill.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
