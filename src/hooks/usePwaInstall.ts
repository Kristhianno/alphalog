import * as React from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false
  const isDisplayModeStandalone = window.matchMedia?.("(display-mode: standalone)").matches
  const isIosStandalone = (window.navigator as { standalone?: boolean }).standalone === true
  return !!isDisplayModeStandalone || !!isIosStandalone
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/**
 * Captura o evento `beforeinstallprompt` (Chrome/Edge/Android) e expõe o estado necessário
 * para o convite de instalação do doc/04 (tela 2) — inclusive o caso iOS, que nunca dispara
 * esse evento e precisa do passo a passo manual ("adicionar à tela de início").
 */
export function usePwaInstall() {
  const [deferredEvent, setDeferredEvent] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = React.useState(isStandaloneDisplay)

  React.useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredEvent(event as BeforeInstallPromptEvent)
    }
    function handleInstalled() {
      setDeferredEvent(null)
      setIsStandalone(true)
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleInstalled)
    }
  }, [])

  const promptInstall = React.useCallback(async () => {
    if (!deferredEvent) return false
    await deferredEvent.prompt()
    const { outcome } = await deferredEvent.userChoice
    setDeferredEvent(null)
    return outcome === "accepted"
  }, [deferredEvent])

  return {
    isStandalone,
    isIOS: isIosDevice(),
    canPromptInstall: !!deferredEvent,
    promptInstall,
  }
}