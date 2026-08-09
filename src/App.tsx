import * as React from "react"
import { toast } from "sonner"
import { AppProviders } from "@/providers/AppProviders"
import { AppRouter } from "@/router"
import { usePwaInstall } from "@/hooks/usePwaInstall"

function StandaloneNotice() {
  const { isStandalone } = usePwaInstall()

  React.useEffect(() => {
    if (isStandalone) toast.info("Você está no app instalado.")
  }, [isStandalone])

  return null
}

function App() {
  return (
    <AppProviders>
      <StandaloneNotice />
      <AppRouter />
    </AppProviders>
  )
}

export default App