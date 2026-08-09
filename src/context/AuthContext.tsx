import * as React from "react"
import {
  buildActor,
  currentSessionForUser,
  login as apiLogin,
  register as apiRegister,
  type Session,
} from "@/mocks/api/auth.api"
import type { Actor } from "@/mocks/api/shared/actor"

const SESSION_STORAGE_KEY = "alphadata:session-user-id"

interface AuthContextValue {
  session: Session | null
  actor: Actor | null
  isInitializing: boolean
  login: (identifier: string, password: string) => Promise<void>
  register: (params: { name: string; email: string; password: string }) => Promise<void>
  logout: () => void
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [isInitializing, setIsInitializing] = React.useState(true)

  React.useEffect(() => {
    const savedUserId = localStorage.getItem(SESSION_STORAGE_KEY)
    if (savedUserId) {
      const restored = currentSessionForUser(savedUserId)
      if (restored) setSession(restored)
      else localStorage.removeItem(SESSION_STORAGE_KEY)
    }
    setIsInitializing(false)
  }, [])

  const login = React.useCallback(async (identifier: string, password: string) => {
    const result = await apiLogin(identifier, password)
    setSession(result)
    localStorage.setItem(SESSION_STORAGE_KEY, result.user.id)
  }, [])

  const register = React.useCallback(
    async (params: { name: string; email: string; password: string }) => {
      const result = await apiRegister(params)
      setSession(result)
      localStorage.setItem(SESSION_STORAGE_KEY, result.user.id)
    },
    [],
  )

  const logout = React.useCallback(() => {
    setSession(null)
    localStorage.removeItem(SESSION_STORAGE_KEY)
  }, [])

  const actor = React.useMemo(() => (session ? buildActor(session) : null), [session])

  const value = React.useMemo(
    () => ({ session, actor, isInitializing, login, register, logout }),
    [session, actor, isInitializing, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext)
  if (!context) throw new Error("useAuth deve ser usado dentro de <AuthProvider>")
  return context
}
