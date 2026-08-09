import * as React from "react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { AppShell } from "@/components/layout/AppShell"
import { isRouteAllowedForRole } from "@/lib/navigation"
import { LoginPage } from "@/features/auth/LoginPage"
import { DashboardPage } from "@/features/dashboard/DashboardPage"
import { RequestsPage } from "@/features/requests/RequestsPage"
import { UsersPage } from "@/features/users/UsersPage"
import { DriversPage } from "@/features/drivers/DriversPage"
import { VehiclesPage } from "@/features/vehicles/VehiclesPage"
import { AccessRestrictedPage } from "@/pages/AccessRestrictedPage"
import { NotFoundPage } from "@/pages/NotFoundPage"

function FullScreenSpinner() {
  return (
    <div className="flex h-svh items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { session, isInitializing } = useAuth()
  if (isInitializing) return <FullScreenSpinner />
  if (!session) return <Navigate to="/login" replace />
  return children
}

function RequireRole({ children }: { children: React.ReactElement }) {
  const { actor } = useAuth()
  const location = useLocation()
  if (!actor) return null
  if (!isRouteAllowedForRole(location.pathname, actor.role)) return <AccessRestrictedPage />
  return children
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route
          path="/solicitacoes"
          element={
            <RequireRole>
              <RequestsPage />
            </RequireRole>
          }
        />
        <Route
          path="/usuarios"
          element={
            <RequireRole>
              <UsersPage />
            </RequireRole>
          }
        />
        <Route
          path="/motoristas"
          element={
            <RequireRole>
              <DriversPage />
            </RequireRole>
          }
        />
        <Route
          path="/veiculos"
          element={
            <RequireRole>
              <VehiclesPage />
            </RequireRole>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
