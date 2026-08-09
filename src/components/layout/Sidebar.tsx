import { NavLink } from "react-router-dom"
import { ChevronsLeft, ChevronsRight, LogOut, RotateCcw } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useSidebar } from "@/context/SidebarContext"
import { navItemsForRole } from "@/lib/navigation"
import { ROLE_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { initials } from "@/lib/format"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { resetDB } from "@/mocks/db/store"
import { toast } from "sonner"
import logoHorizontal from "@/assets/logo-horizontal.png"
import logoStacked from "@/assets/logo-stacked.png"

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { session, actor, logout } = useAuth()
  const { collapsed, toggleCollapsed } = useSidebar()

  if (!session || !actor) return null

  const items = navItemsForRole(actor.role)

  function handleResetData() {
    resetDB()
    toast.success("Dados de exemplo restaurados.")
    window.location.href = "/"
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn("flex h-16 items-center border-b border-sidebar-border px-4", collapsed && "justify-center px-2")}>
        {collapsed ? (
          <img src={logoStacked} alt="AlphaData" className="h-8 w-8 object-contain" />
        ) : (
          <img src={logoHorizontal} alt="AlphaData" className="h-6 w-auto" />
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {items.map((item) => {
          const Icon = item.icon
          const link = (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )

          if (!collapsed) return link
          return (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <button
          type="button"
          onClick={handleResetData}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <RotateCcw className="size-4 shrink-0" />
          {!collapsed && <span>Restaurar dados de exemplo</span>}
        </button>

        <div className={cn("mt-2 flex items-center gap-2 rounded-md px-2 py-2", collapsed && "flex-col")}>
          <Avatar className="size-8">
            <AvatarFallback>{initials(session.user.name)}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{session.user.name}</p>
              <p className="truncate text-xs text-sidebar-foreground/60">{ROLE_LABELS[actor.role]}</p>
            </div>
          )}
          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={logout} title="Sair">
            <LogOut className="size-4" />
          </Button>
        </div>

        <button
          type="button"
          onClick={toggleCollapsed}
          className="mt-1 hidden w-full items-center justify-center rounded-md py-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground lg:flex"
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        </button>
      </div>
    </div>
  )
}

export function DesktopSidebar() {
  const { collapsed } = useSidebar()
  return (
    <aside
      className={cn(
        "hidden border-r border-sidebar-border transition-[width] duration-200 lg:block",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <SidebarContent />
    </aside>
  )
}

export function MobileSidebar() {
  const { mobileOpen, setMobileOpen } = useSidebar()
  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Menu de navegação</SheetTitle>
        </SheetHeader>
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
