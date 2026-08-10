import { Navigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BrandPanel } from "./BrandPanel"
import { LoginForm } from "./LoginForm"
import { RegisterForm } from "./RegisterForm"
import { InstallPwaDialog } from "@/components/pwa/InstallPwaDialog"
import logoHorizontal from "@/assets/logo-horizontal.png"

export function LoginPage() {
  const { session } = useAuth()

  if (session) return <Navigate to="/" replace />

  return (
    <div className="grid min-h-svh bg-sidebar lg:grid-cols-2 lg:bg-background">
      <BrandPanel />
      <div className="flex flex-col items-center justify-center gap-8 p-6 sm:p-10">
        <img src={logoHorizontal} alt="AlphaLog" className="h-14 w-auto lg:hidden" />

        <div className="w-full max-w-sm space-y-6 rounded-2xl bg-card p-6 shadow-lg sm:p-8 lg:max-w-md lg:p-10">
          <Tabs defaultValue="entrar">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entrar">Entrar</TabsTrigger>
              <TabsTrigger value="criar-conta">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="entrar">
              <LoginForm />
            </TabsContent>
            <TabsContent value="criar-conta">
              <RegisterForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <InstallPwaDialog />
    </div>
  )
}
