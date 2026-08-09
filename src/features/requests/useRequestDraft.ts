import * as React from "react"
import type { UseFormReturn } from "react-hook-form"

const DRAFT_STORAGE_KEY = "alphadata:solicitacao-draft"

/**
 * Persiste o rascunho do formulário de nova solicitação no localStorage enquanto o usuário
 * digita (doc/04, 5a), para não perder o preenchimento em caso de fechamento acidental.
 * Anexos (blob URLs) não sobrevivem a um reload, então ficam fora do rascunho persistido.
 */
export function useRequestDraft<T extends Record<string, unknown>>(
  form: UseFormReturn<T>,
  defaultValues: T,
) {
  const hydrated = React.useRef(false)

  React.useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (raw) form.reset({ ...defaultValues, ...JSON.parse(raw) })
    } catch {
      // rascunho corrompido — ignora e segue com os valores padrão
    }
  }, [form, defaultValues])

  React.useEffect(() => {
    const subscription = form.watch((values) => {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(values))
    })
    return () => subscription.unsubscribe()
  }, [form])

  const clearDraft = React.useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY)
  }, [])

  return { clearDraft }
}