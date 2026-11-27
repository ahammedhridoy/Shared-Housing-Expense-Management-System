import { NavLink, Outlet, Link } from "react-router-dom"
import { ShieldAlert } from "lucide-react"
import { messNav } from "@/components/layout/mess-nav"
import { useMessContext } from "@/features/mess/hooks/useMessData"
import { EmptyState } from "@/components/common/ui-kit"
import { buttonVariants } from "@/components/ui/variants"
import { cn } from "@/lib/utils"

// Wraps every /mess/:messId page: access check + bottom tab bar on phones
export default function MessLayout() {
  const { messId, error, isLoading } = useMessContext()

  if (error && !isLoading) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="You can't open this mess"
        description={error.message}
        action={
          <Link to="/mess" className={buttonVariants({ variant: "outline" })}>
            Back to my messes
          </Link>
        }
      />
    )
  }

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-5 pb-20 md:pb-0">
        <Outlet />
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t bg-card/95 backdrop-blur md:hidden">
        {messNav.map((item) => (
          <NavLink
            key={item.suffix}
            to={`/mess/${messId}${item.suffix}`}
            end={item.suffix === ""}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn("rounded-full px-3 py-1", isActive && "bg-primary/10")}>
                  <item.icon className="size-4" />
                </span>
                {item.short}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
