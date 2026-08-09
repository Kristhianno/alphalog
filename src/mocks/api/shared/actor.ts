import type { Role } from "@/types/enums"

/**
 * Contexto de quem está chamando a API mock — o equivalente ao usuário autenticado que
 * uma política de RLS real enxergaria. Toda função de mutação/leitura sensível recebe
 * um Actor e decide o que mostrar/permitir a partir dele, nunca a UI.
 */
export interface Actor {
  userId: string
  role: Role
  /** id do cadastro de motorista vinculado a este usuário, quando role === 'motorista' */
  driverId?: string
  /** id do cadastro de cliente vinculado a este usuário (por e-mail), quando role === 'cliente' */
  clientId?: string
}

export function isStaff(actor: Actor): boolean {
  return actor.role === "admin" || actor.role === "gestor" || actor.role === "assistente_logistico"
}

/** "É admin estrito?" (doc/02) — verdadeiro só para admin, usado nas ações mais sensíveis. */
export function isAdminStrict(actor: Actor): boolean {
  return actor.role === "admin"
}
