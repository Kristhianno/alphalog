import * as React from "react"

interface SidebarContextValue {
  collapsed: boolean
  toggleCollapsed: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false)

  const value = React.useMemo(
    () => ({
      collapsed,
      toggleCollapsed: () => setCollapsed((c) => !c),
    }),
    [collapsed],
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function useSidebar(): SidebarContextValue {
  const context = React.useContext(SidebarContext)
  if (!context) throw new Error("useSidebar deve ser usado dentro de <SidebarProvider>")
  return context
}