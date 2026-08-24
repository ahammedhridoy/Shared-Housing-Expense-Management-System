import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMyMesses, useCreateMess, useDeleteMess } from "@/features/mess/hooks/useMess"
import { createMessSchema, type CreateMessFormData } from "@/features/mess/validations/create-mess.schema"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Home, Trash2, MapPin } from "lucide-react"

export default function MessListPage() {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: messes, isLoading } = useMyMesses()
  const create = useCreateMess()
  const del = useDeleteMess()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateMessFormData>({
    resolver: zodResolver(createMessSchema),
    defaultValues: { name: "", description: "" },
  })

  function onSubmit(data: CreateMessFormData) {
    create.mutate({ name: data.name, description: data.description || undefined }, {
      onSuccess: () => { reset(); setOpen(false) },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">My Messes</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2"><Plus className="h-4 w-4" />Create Mess</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Create a New Mess</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mess-name">Mess Name</Label>
                <Input id="mess-name" {...register("name")} placeholder="e.g. Sunset Villa" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mess-desc">Description (optional)</Label>
                <Input id="mess-desc" {...register("description")} placeholder="A short description" />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              </div>
              {create.isError && <p className="text-sm text-danger">Failed to create mess.</p>}
              <Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending ? "Creating..." : "Create Mess"}</Button>
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
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-1"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-56" /></div>
                </div>
              ))}
            </div>
          ) : (messes ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Home className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">No messes yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create your first mess or accept an invitation</p>
            </div>
          ) : (
            <div className="divide-y">
              {(messes ?? []).map((mess) => (
                <div key={mess.id} className="flex items-center gap-4 p-4">
                  <Link
                    to={`/mess/${mess.id}`}
                    className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-lg"
                  >
                    {mess.name.charAt(0)}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/mess/${mess.id}`} className="text-sm font-medium text-foreground hover:underline">
                      {mess.name}
                    </Link>
                    {(mess as any).address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {(mess as any).address}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => { setConfirmDelete({ id: mess.id, name: mess.name }); setDeleteOpen(true) }}
                    className="rounded-md p-1 text-muted-foreground hover:text-danger transition-colors"
                    title="Delete mess"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Mess</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong className="text-foreground">{confirmDelete?.name}</strong>?
              This action cannot be undone. All data will be lost.
            </p>
            {del.isError && <p className="text-sm text-danger">Failed to delete mess.</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={del.isPending}
                onClick={() => {
                  if (!confirmDelete) return
                  del.mutate(confirmDelete.id, {
                    onSuccess: () => { setDeleteOpen(false); setConfirmDelete(null) },
                  })
                }}
              >
                {del.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
