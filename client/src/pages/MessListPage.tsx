import { useState } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Crown, Home, MapPin, Plus, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, PageHeader } from "@/components/common/ui-kit"
import { CreateMessDialog } from "@/components/common/CreateMessDialog"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { toast } from "@/components/common/toast"
import { useDeleteMess, useMyMesses } from "@/features/mess/hooks/useMess"
import type { MessListItem } from "@/types/api"

export default function MessListPage() {
  const { data: messes, isLoading } = useMyMesses()
  const del = useDeleteMess()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState<MessListItem | null>(null)

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="My messes"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus /> Create mess
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : !messes?.length ? (
        <EmptyState
          icon={Home}
          title="No messes yet"
          description="Create a mess for your flat, or ask your manager to invite you by email."
          action={<Button onClick={() => setOpen(true)}><Plus /> Create mess</Button>}
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {messes.map((mess) => (
            <li key={mess.id} className="flex items-center gap-2 pr-2">
              <Link to={`/mess/${mess.id}`} className="flex min-w-0 flex-1 items-center gap-4 p-4 hover:bg-muted/50">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-semibold text-primary">
                  {mess.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    {mess.name}
                    {mess.role === "MANAGER" && <Crown className="size-3.5 text-amber-600" aria-label="You manage this mess" />}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="size-3" /> {mess.memberCount} members</span>
                    {mess.address && <span className="flex items-center gap-1"><MapPin className="size-3" /> {mess.address}</span>}
                  </p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
              {mess.role === "MANAGER" && (
                <Button variant="ghost" size="icon-sm" aria-label={`Delete ${mess.name}`} onClick={() => setDeleting(mess)}>
                  <Trash2 className="text-muted-foreground" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <CreateMessDialog open={open} onOpenChange={setOpen} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="All meals, bazar, bills, deposits and history of this mess will be permanently deleted for everyone. This cannot be undone."
        confirmLabel="Delete mess"
        destructive
        loading={del.isPending}
        onConfirm={() =>
          deleting &&
          del.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Mess deleted")
              setDeleting(null)
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </div>
  )
}
