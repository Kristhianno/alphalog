import { Menu, WifiOff } from "lucide-react"
import { useLocation } from "react-router-dom"
import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import { useSidebar } from "@/context/SidebarContext"
import { Button } from "@/components/ui/button"
import type { Role } from "@/types/enums"

function pageTitleFor(pathname: string, role: Role): { title: string; subtitle: string } {
  if (pathname === "/") {
    if (role === "cliente") return { title: "Minhas Solicitações", subtitle: "Acompanhe suas entregas em andamento" }
    if (role === "motorista") return { title: "Minhas Entregas", subtitle: "Suas corridas em andamento e concluídas" }
    if (role === "admin") return { title: "Painel do Administrador", subtitle: "Visão completa da operação" }
    return { title: "Painel do Gestor", subtitle: "Visão completa da operação" }
  }
  if (pathname.startsWith("/solicitacoes")) {
    return role === "cliente"
      ? { title: "Solicitações", subtitle: "Crie e acompanhe suas solicitações" }
      : { title: "Solicitações", subtitle: "Gerencie as solicitações" }
  }
  if (pathname.startsWith("/usuarios")) {
    return { title: "Usuários", subtitle: "Contas de acesso ao sistema" }
  }
  if (pathname.startsWith("/motoristas")) {
    return role === "motorista"
      ? { title: "Minhas Corridas", subtitle: "Corridas disponíveis e suas entregas" }
      : { title: "Gestão de Motoristas", subtitle: "Frota de motoristas e rastreamento" }
  }
  if (pathname.startsWith("/veiculos")) {
    return role === "motorista"
      ? { title: "Meus Veículos", subtitle: "Abastecimento, óleo, manutenção e checklist" }
      : { title: "Gestão da Frota", subtitle: "Indicadores, custos e histórico por veículo" }
  }
  return { title: "AlphaData", subtitle: "" }
}

export function Header() {
  const { actor } = useAuth()
  const { setMobileOpen } = useSidebar()
  const location = useLocation()
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine)

  React.useEffect(() => {
    const goOnline = () => setIsOffline(false)
    const goOffline = () => setIsOffline(true)
    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)
    return () => {
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
    }
  }, [])

  if (!actor) return null
  const { title, subtitle } = pageTitleFor(location.pathname, actor.role)

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b border-border bg-background/95 backdrop-blur">
      {isOffline && (
        <div className="flex items-center justify-center gap-2 bg-warning/15 px-4 py-1.5 text-xs font-medium text-warning-foreground">
          <WifiOff className="size-3.5" />
          Você está offline — alguns dados podem estar desatualizados.
        </div>
      )}
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </header>
  )
}
