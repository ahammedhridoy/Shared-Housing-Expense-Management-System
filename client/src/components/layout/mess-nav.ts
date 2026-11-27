import { LayoutDashboard, UtensilsCrossed, Receipt, Wallet, Users, History } from "lucide-react"

export const messNav = [
  { suffix: "", icon: LayoutDashboard, label: "Overview", short: "Overview" },
  { suffix: "/meals", icon: UtensilsCrossed, label: "Meals", short: "Meals" },
  { suffix: "/expenses", icon: Receipt, label: "Bazar & bills", short: "Expenses" },
  { suffix: "/deposits", icon: Wallet, label: "Deposits", short: "Deposits" },
  { suffix: "/members", icon: Users, label: "Members & rent", short: "Members" },
  { suffix: "/history", icon: History, label: "History", short: "History" },
]
