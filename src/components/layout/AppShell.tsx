import { Outlet } from "react-router-dom"
import { DesktopSidebar, MobileBottomNav } from "./Sidebar"
import { Header } from "./Header"

export function AppShell() {
  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <DesktopSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 pb-28 sm:p-6 lg:pb-6">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}