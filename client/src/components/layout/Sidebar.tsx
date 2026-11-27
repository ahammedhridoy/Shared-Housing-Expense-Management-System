import { useLocation } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { LayoutDashboard, Home, User, LogOut, Building2 } from "lucide-react"
import { NavItem } from "./NavItem"
import { messNav } from "./mess-nav"
import { useAuthStore } from "@/stores/auth.store"
import { authApi, messApi } from "@/services"
import { messKeys } from "@/features/mess/hooks/useMessData"
import { Button } from "@/components/ui/button"

const mainNav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/mess", icon: Home, label: "My messes" },
  { to: "/profile", icon: User, label: "Profile" },
]

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)

  const messId = location.pathname.match(/^\/mess\/([^/]+)/)?.[1] ?? null
  const { data: mess } = useQuery({
    queryKey: messKeys.detail(messId ?? ""),
    queryFn: () => messApi.getById(messId!),
    enabled: !!messId,
  })

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } finally {
      logout()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Building2 className="size-4" />
        </span>
        <span className="text-base font-semibold">SplitEase</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {mainNav.map((item) => (
          <NavItem key={item.to} {...item} end={item.to === "/mess"} onClick={onNavigate} />
        ))}

        {messId && (
          <>
            <div className="my-3 border-t" />
            <p className="truncate px-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {mess?.name ?? "Mess"}
            </p>
            {messNav.map((item) => (
              <NavItem
                key={item.suffix}
                to={`/mess/${messId}${item.suffix}`}
                icon={item.icon}
                label={item.label}
                end={item.suffix === ""}
                onClick={onNavigate}
              />
            ))}
          </>
        )}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={handleLogout}>
          <LogOut className="size-4" />
          <span>Log out</span>
        </Button>
      </div>
    </div>
  )
}
