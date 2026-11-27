import { lazy, Suspense } from "react"

// Lazy-loaded page components
export const DashboardPage = lazy(() => import("@/pages/DashboardPage"))
export const MessListPage = lazy(() => import("@/pages/MessListPage"))
export const MessLayout = lazy(() => import("@/layouts/MessLayout"))
export const MessOverviewPage = lazy(() => import("@/pages/MessOverviewPage"))
export const MealsPage = lazy(() => import("@/pages/MealsPage"))
export const ExpensesPage = lazy(() => import("@/pages/ExpensesPage"))
export const DepositsPage = lazy(() => import("@/pages/DepositsPage"))
export const HistoryPage = lazy(() => import("@/pages/HistoryPage"))
export const MembersPage = lazy(() => import("@/pages/MembersPage"))
export const ProfilePage = lazy(() => import("@/pages/ProfilePage"))
export const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"))
export const InvitePage = lazy(() => import("@/pages/InvitePage"))

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center py-16">
      <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  )
}

export function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}
