import { LayoutDashboard, Package, Sparkles, Truck, Users, Warehouse } from "lucide-react"
import type { Role } from "@/types/enums"

export interface NavItem {
  label: string
  path: string
  icon: typeof LayoutDashboard
  roles: Role[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Painel",
    path: "/",
    icon: LayoutDashboard,
    roles: ["admin", "gestor", "assistente_logistico", "motorista", "cliente"],
  },
  {
    label: "Solicitações",
    path: "/solicitacoes",
    icon: Package,
    roles: ["admin", "gestor", "assistente_logistico", "cliente"],
  },
  {
    label: "Motoristas",
    path: "/motoristas",
    icon: Truck,
    roles: ["admin", "gestor", "assistente_logistico", "motorista"],
  },
  {
    label: "Veículos",
    path: "/veiculos",
    icon: Warehouse,
    roles: ["admin", "gestor", "assistente_logistico", "motorista"],
  },
  {
    label: "Usuários",
    path: "/usuarios",
    icon: Users,
    roles: ["admin", "gestor", "assistente_logistico"],
  },
  {
    label: "Assistente IA",
    path: "/assistente-ia",
    icon: Sparkles,
    roles: ["admin", "gestor", "assistente_logistico"],
  },
]

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role))
}

export function isRouteAllowedForRole(path: string, role: Role): boolean {
  const item = NAV_ITEMS.find((i) => i.path === path)
  return item ? item.roles.includes(role) : true
}
