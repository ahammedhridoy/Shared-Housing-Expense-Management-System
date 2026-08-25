import { useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Home,
  User,
  UtensilsCrossed,
  Receipt,
  CreditCard,
  FileText,
  HandCoins,
  Users,
  LogOut,
} from "lucide-react"
import { NavItem } from "./NavItem"
import { useAuthStore } from "@/stores/auth.store"
import { authApi } from "@/services"
import { Button } from "@/components/ui/button"

const mainNav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/mess", icon: Home, label: "My Messes" },
]

const messNav = [
  { suffix: "", icon: LayoutDashboard, label: "Overview" },
  { suffix: "/meals", icon: UtensilsCrossed, label: "Meals" },
  { suffix: "/expenses", icon: Receipt, label: "Expenses" },
  { suffix: "/payments", icon: CreditCard, label: "Payments" },
  { suffix: "/bills", icon: FileText, label: "Bills" },
  { suffix: "/settlements", icon: HandCoins, label: "Settlements" },
  { suffix: "/members", icon: Users, label: "Members" },
]

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)

  const pathMatch = location.pathname.match(/^\/mess\/([^/]+)/)
  const messId = pathMatch ? pathMatch[1] : null

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } finally {
      logout()
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-lg font-semibold text-primary">
          SplitEase
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {mainNav.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            onClick={onNavigate}
          />
        ))}

        {/* Mess sub-nav */}
        {messId && (
          <>
            <div className="my-3 border-t" />
            <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">
              Mess
            </p>
            {messNav.map((item) => (
              <NavItem
                key={item.suffix}
                to={`/mess/${messId}${item.suffix}`}
                icon={item.icon}
                label={item.label}
                onClick={onNavigate}
              />
            ))}
          </>
        )}
      </nav>

      {/* User + Logout */}
      <div className="border-t p-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  )
}
