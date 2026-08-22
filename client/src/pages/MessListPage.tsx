import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Home, Plus, Users, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useMyMesses, useCreateMess } from "@/features/mess/hooks/useMess"
import {
  createMessSchema,
  type CreateMessFormData,
} from "@/features/mess/validations/create-mess.schema"

export default function MessListPage() {
  const [open, setOpen] = useState(false)
  const { data: messes, isLoading } = useMyMesses()
  const createMess = useCreateMess()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMessFormData>({
    resolver: zodResolver(createMessSchema),
  })

  const onSubmit = (data: CreateMessFormData) => {
    const payload = {
      name: data.name,
      description: data.description || undefined,
    }
    createMess.mutate(payload, {
      onSuccess: () => {
        reset()
        setOpen(false)
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Messes</h1>
          <p className="text-sm text-muted-foreground">
            Manage your shared living spaces
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={<Button size="sm" />}
          >
            <Plus className="mr-1 size-4" />
            Create Mess
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>Create a Mess</DialogTitle>
                <DialogDescription>
                  Set up a new shared living space and invite members.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Name *
                  </label>
                  <Input
                    id="name"
                    placeholder="e.g. Sunset Apartments"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    placeholder="Optional description..."
                    className="flex w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className="text-xs text-destructive">
                      {errors.description.message}
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={createMess.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMess.isPending}>
                  {createMess.isPending ? (
                    <>
                      <Loader2 className="mr-1 size-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mess List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border bg-muted/50"
            />
          ))}
        </div>
      ) : messes && messes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {messes.map((mess) => (
            <Link
              key={mess.id}
              to={`/mess/${mess.id}`}
              className="group rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Home className="size-5" />
                </div>
                <Badge variant={mess.role === "MANAGER" ? "default" : "secondary"}>
                  {mess.role}
                </Badge>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground group-hover:text-primary">
                {mess.name}
              </h3>
              {mess.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {mess.description}
                </p>
              )}
              {mess.address && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {mess.address}
                </p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Users className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-medium text-foreground">
            No messes yet
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a mess or ask a friend to invite you.
          </p>
        </div>
      )}
    </div>
  )
}
