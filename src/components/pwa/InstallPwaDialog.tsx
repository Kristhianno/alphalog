import * as React from "react"
import { Share, Smartphone, WifiOff, Zap } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { usePwaInstall } from "@/hooks/usePwaInstall"

const DISMISSED_KEY = "alphadata:pwa-install-dismissed"
const SHOW_DELAY_MS = 4000

/**
 * Convite de instalação do PWA (doc/04, tela 2), exibido a partir do login depois de alguns
 * segundos — dispensável e lembrado depois via preferência local do navegador. iOS nunca
 * dispara `beforeinstallprompt`, então mostra o passo a passo manual em vez de um botão.
 */
export function InstallPwaDialog() {
  const { isStandalone, isIOS, canPromptInstall, promptInstall } = usePwaInstall()
  const [open, setOpen] = React.useState(false)

  const hasActionableInstall = canPromptInstall || isIOS

  React.useEffect(() => {
    if (isStandalone || !hasActionableInstall) return
    if (localStorage.getItem(DISMISSED_KEY)) return

    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [isStandalone, hasActionableInstall])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1")
    setOpen(false)
  }

  async function handleInstallClick() {
    const accepted = await promptInstall()
    if (accepted) toast.success("AlphaLog instalado!")
    dismiss()
  }

  if (!hasActionableInstall) return null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Instale o AlphaLog</DialogTitle>
          <DialogDescription>Acesse mais rápido, direto da tela inicial do seu dispositivo.</DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-2.5">
            <Zap className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>Acesso rápido, sem precisar abrir o navegador</span>
          </li>
          <li className="flex items-start gap-2.5">
            <WifiOff className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>Funciona parcialmente offline</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Smartphone className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>Experiência parecida com um app nativo</span>
          </li>
        </ul>

        {isIOS && !canPromptInstall ? (
          <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            Toque em <Share className="mx-1 inline size-3.5 -translate-y-0.5" /> (Compartilhar) e depois em
            <span className="font-medium text-foreground"> "Adicionar à Tela de Início"</span>.
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={dismiss}>
            Agora não
          </Button>
          {canPromptInstall && (
            <Button type="button" onClick={handleInstallClick}>
              Instalar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}