import { lazy, Suspense } from "react"
import { createBrowserRouter } from "react-router-dom"
import PrivateRoute from "./PrivateRoute"
import PublicRoute from "./PublicRoute"
import AppLayout from "@/layouts/AppLayout"

// Eagerly loaded — used on every navigation
import LoginPage from "@/pages/LoginPage"
import RegisterPage from "@/pages/RegisterPage"

// Lazy-loaded page components
const DashboardPage = lazy(() => import("@/pages/DashboardPage"))
const MessListPage = lazy(() => import("@/pages/MessListPage"))
const MessLayout = lazy(() => import("@/pages/MessLayout"))
const MessOverviewPage = lazy(() => import("@/pages/MessOverviewPage"))
const MealsPage = lazy(() => import("@/pages/MealsPage"))
const ExpensesPage = lazy(() => import("@/pages/ExpensesPage"))
const PaymentsPage = lazy(() => import("@/pages/PaymentsPage"))
const BillsPage = lazy(() => import("@/pages/BillsPage"))
const SettlementsPage = lazy(() => import("@/pages/SettlementsPage"))
const MembersPage = lazy(() => import("@/pages/MembersPage"))
const ProfilePage = lazy(() => import("@/pages/ProfilePage"))
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"))

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center py-16">
      <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  )
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  // Public routes
  {
    path: "/login",
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: "/register",
    element: (
      <PublicRoute>
        <RegisterPage />
      </PublicRoute>
    ),
  },

  // Private routes with AppLayout
  {
    path: "/",
    element: (
      <PrivateRoute>
        <AppLayout />
      </PrivateRoute>
    ),
    children: [
      { index: true, element: <LazyPage><DashboardPage /></LazyPage> },
      { path: "dashboard", element: <LazyPage><DashboardPage /></LazyPage> },
      { path: "profile", element: <LazyPage><ProfilePage /></LazyPage> },
      { path: "mess", element: <LazyPage><MessListPage /></LazyPage> },
      {
        path: "mess/:messId",
        element: <LazyPage><MessLayout /></LazyPage>,
        children: [
          { index: true, element: <LazyPage><MessOverviewPage /></LazyPage> },
          { path: "meals", element: <LazyPage><MealsPage /></LazyPage> },
          { path: "expenses", element: <LazyPage><ExpensesPage /></LazyPage> },
          { path: "payments", element: <LazyPage><PaymentsPage /></LazyPage> },
          { path: "bills", element: <LazyPage><BillsPage /></LazyPage> },
          { path: "settlements", element: <LazyPage><SettlementsPage /></LazyPage> },
          { path: "members", element: <LazyPage><MembersPage /></LazyPage> },
        ],
      },
    ],
  },

  // Catch all
  {
    path: "*",
    element: <LazyPage><NotFoundPage /></LazyPage>,
  },
])
