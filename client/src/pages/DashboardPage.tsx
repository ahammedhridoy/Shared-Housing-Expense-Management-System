import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import {
  Home,
  Plus,
  Users,
  Mail,
  Check,
  X,
  LayoutDashboard,
  ArrowRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { messApi, invitationApi } from "@/services"
import { useAuth } from "@/hooks/useAuth"

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  iconBg = "bg-primary/10",
  iconColor = "text-primary",
}: {
  icon: typeof Home
  label: string
  value: number
  loading: boolean
  iconBg?: string
  iconColor?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`flex size-10 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`size-5 ${iconColor}`} />
        </div>
        <div>
          {loading ? (
            <Skeleton className="h-5 w-8" />
          ) : (
            <p className="text-2xl font-semibold">{value}</p>
          )}
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: messes, isLoading: messesLoading } = useQuery({
    queryKey: ["messes"],
    queryFn: messApi.getMy,
  })

  const { data: invitations, isLoading: invitationsLoading } = useQuery({
    queryKey: ["invitations", "pending"],
    queryFn: invitationApi.getMyPending,
  })

  const acceptMutation = useMutation({
    mutationFn: invitationApi.accept,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messes"] })
      queryClient.invalidateQueries({ queryKey: ["invitations", "pending"] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: invitationApi.reject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations", "pending"] })
    },
  })

  const totalMesses = messes?.length ?? 0
  const managerMesses = messes?.filter((m) => m.role === "MANAGER").length ?? 0
  const memberMesses = messes?.filter((m) => m.role === "MEMBER").length ?? 0
  const pendingInvites = invitations?.length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here's an overview of your messes and activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Home} label="Total Messes" value={totalMesses} loading={messesLoading} />
        <StatCard icon={LayoutDashboard} label="Managed by You" value={managerMesses} loading={messesLoading} />
        <StatCard icon={Users} label="Member of" value={memberMesses} loading={messesLoading} />
        <StatCard icon={Mail} label="Pending Invitations" value={pendingInvites} loading={invitationsLoading} iconBg="bg-warning/10" iconColor="text-warning" />
      </div>

      {!invitationsLoading && pendingInvites > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invitations?.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{inv.mess.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Invited by {inv.inviter.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-success"
                    onClick={() => acceptMutation.mutate(inv.id)}
                    disabled={acceptMutation.isPending}
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-destructive"
                    onClick={() => rejectMutation.mutate(inv.id)}
                    disabled={rejectMutation.isPending}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">My Messes</CardTitle>
          <Button size="sm" render={<Link to="/mess" />}>
            <Plus className="mr-1 size-4" />
            New Mess
          </Button>
        </CardHeader>
        <CardContent>
          {messesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : messes && messes.length > 0 ? (
            <div className="space-y-2">
              {messes.map((mess) => (
                <Link
                  key={mess.id}
                  to={`/mess/${mess.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{mess.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {mess.role}
                      </Badge>
                    </div>
                    {mess.description && (
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {mess.description}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
              <Home className="mb-3 size-10 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">
                No messes yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create a mess or ask a friend to invite you.
              </p>
              <Button size="sm" className="mt-4" render={<Link to="/mess" />}>
                <Plus className="mr-1 size-4" />
                Create Mess
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
