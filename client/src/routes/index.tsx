import { createBrowserRouter } from "react-router-dom"
import PrivateRoute from "./PrivateRoute"
import PublicRoute from "./PublicRoute"
import AppLayout from "@/layouts/AppLayout"

// Eagerly loaded — used on every navigation
import LoginPage from "@/pages/LoginPage"
import RegisterPage from "@/pages/RegisterPage"
import ForgotPasswordPage from "@/pages/ForgotPasswordPage"
import ResetPasswordPage from "@/pages/ResetPasswordPage"

import { LazyPage, DashboardPage, MessListPage, MessLayout, MessOverviewPage, MealsPage, ExpensesPage, DepositsPage, HistoryPage, MembersPage, ProfilePage, NotFoundPage, InvitePage } from "./lazy-pages"

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
  {
    path: "/forgot-password",
    element: (
      <PublicRoute>
        <ForgotPasswordPage />
      </PublicRoute>
    ),
  },
  {
    path: "/reset-password",
    element: (
      <PublicRoute>
        <ResetPasswordPage />
      </PublicRoute>
    ),
  },

  // Invite link from email/WhatsApp: works logged in or out
  {
    path: "/invite/:token",
    element: <LazyPage><InvitePage /></LazyPage>,
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
          { path: "deposits", element: <LazyPage><DepositsPage /></LazyPage> },
          { path: "history", element: <LazyPage><HistoryPage /></LazyPage> },
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
