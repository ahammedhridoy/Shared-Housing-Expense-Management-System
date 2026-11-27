import { Link, useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Building2, CheckCircle2, Clock, MailX, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/variants"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/common/toast"
import { invitationApi, authApi } from "@/services"
import { useAuth } from "@/hooks/useAuth"
import { useAuthStore } from "@/stores/auth.store"
import { useAcceptInvitation, useRejectInvitation } from "@/features/mess/hooks/useInvitation"
import type { InvitationPreview } from "@/types/api"

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Building2 className="size-4" />
        </span>
        <span className="text-lg font-semibold">SplitEase</span>
      </div>
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm">{children}</div>
    </div>
  )
}

function Closed({ inv }: { inv: InvitationPreview }) {
  const text = {
    ACCEPTED: { icon: CheckCircle2, title: "This invitation was already accepted", body: "Log in to open the mess." },
    REJECTED: { icon: MailX, title: "This invitation was declined", body: "Ask the manager to send a new one if you want to join." },
    EXPIRED: { icon: Clock, title: "This invitation has expired", body: "Ask the manager to send you a new invitation." },
    PENDING: { icon: Clock, title: "", body: "" },
  }[inv.status]
  return (
    <div className="text-center">
      <text.icon className="mx-auto size-10 text-muted-foreground" />
      <p className="mt-3 font-semibold">{text.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text.body}</p>
      <Link to="/dashboard" className={buttonVariants({ variant: "outline", className: "mt-5" })}>
        Go to dashboard
      </Link>
    </div>
  )
}

export default function InvitePage() {
  const { token = "" } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const logout = useAuthStore((s) => s.logout)
  const accept = useAcceptInvitation()
  const reject = useRejectInvitation()

  const { data: inv, isLoading, error } = useQuery({
    queryKey: ["invitation-link", token],
    queryFn: () => invitationApi.getByToken(token),
    retry: false,
  })

  if (isLoading || authLoading) {
    return (
      <Shell>
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-6 h-9 w-full" />
      </Shell>
    )
  }

  if (error || !inv) {
    return (
      <Shell>
        <div className="text-center">
          <MailX className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">Invitation not found</p>
          <p className="mt-1 text-sm text-muted-foreground">The link may be wrong or the invitation was cancelled.</p>
        </div>
      </Shell>
    )
  }

  if (inv.status !== "PENDING") {
    return (
      <Shell>
        <Closed inv={inv} />
      </Shell>
    )
  }

  const sameEmail = user?.email?.toLowerCase() === inv.email.toLowerCase()

  return (
    <Shell>
      <p className="text-sm text-muted-foreground">{inv.inviter.name} invited you to join</p>
      <h1 className="mt-1 text-2xl font-semibold">{inv.mess.name}</h1>
      {inv.mess.address && <p className="text-sm text-muted-foreground">{inv.mess.address}</p>}
      <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm">
        <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        Share meals, bazar, rent and house bills with your flatmates and see what you owe every month.
      </p>

      {!isAuthenticated ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm">
            This invitation is for <b>{inv.email}</b>. Create an account or log in with that email, then accept it from your dashboard.
          </p>
          <Link to={`/register?email=${encodeURIComponent(inv.email)}`} className={buttonVariants({ className: "w-full" })}>
            Create account
          </Link>
          <Link to="/login" className={buttonVariants({ variant: "outline", className: "w-full" })}>
            I already have an account
          </Link>
        </div>
      ) : !sameEmail ? (
        <div className="mt-6 space-y-3">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            This invitation was sent to <b>{inv.email}</b>, but you're logged in as <b>{user?.email}</b>.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              try {
                await authApi.logout()
              } finally {
                logout()
              }
            }}
          >
            Log out and switch account
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex gap-2">
          <Button
            className="flex-1"
            disabled={accept.isPending}
            onClick={() =>
              accept.mutate(inv.id, {
                onSuccess: () => {
                  toast.success(`You joined ${inv.mess.name}`)
                  navigate(`/mess/${inv.mess.id}`)
                },
                onError: (e) => toast.error(e.message),
              })
            }
          >
            {accept.isPending ? "Joining..." : "Join mess"}
          </Button>
          <Button
            variant="outline"
            disabled={reject.isPending}
            onClick={() =>
              reject.mutate(inv.id, {
                onSuccess: () => {
                  toast.success("Invitation declined")
                  navigate("/dashboard")
                },
                onError: (e) => toast.error(e.message),
              })
            }
          >
            Decline
          </Button>
        </div>
      )}
    </Shell>
  )
}
