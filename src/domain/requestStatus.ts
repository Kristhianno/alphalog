import {
  ACTIVE_REQUEST_STATUSES,
  DRIVER_FORWARD_SEQUENCE,
  STAFF_ROLES,
  type Role,
  type RequestStatus,
} from "@/types/enums"

export { ACTIVE_REQUEST_STATUSES }

/** Rótulos em pt-BR para exibição, na ordem típica do ciclo de vida (regra 1). */
export const STATUS_LABELS: Record<RequestStatus, string> = {
  agendada: "Agendada",
  solicitada: "Solicitada",
  aceita: "Aceita",
  pendente_coleta: "Pendente de coleta",
  coletada: "Coletada",
  em_rota: "Em rota",
  pendente_entrega: "Pendente de entrega",
  entregue: "Entregue",
  cancelada: "Cancelada",
}

export function isStaffRole(role: Role): boolean {
  return (STAFF_ROLES as Role[]).includes(role)
}

export function isActiveStatus(status: RequestStatus): boolean {
  return ACTIVE_REQUEST_STATUSES.includes(status)
}

/** Status em que o cliente ainda pode editar/cancelar a própria solicitação (regra 7 / doc 02). */
export function isClientEditableStatus(status: RequestStatus): boolean {
  return status === "agendada" || status === "solicitada"
}

/**
 * Marcar como "coletada" exige pelo menos um anexo de evidência fotográfica (regra 2).
 */
export function requiresAttachmentForTransition(target: RequestStatus): boolean {
  return target === "coletada"
}

interface TransitionCheck {
  allowed: boolean
  reason?: string
}

/**
 * Decide se `actorRole` pode mover uma solicitação de `current` para `target` (regra 1).
 * - Motorista: só avança na sequência `DRIVER_FORWARD_SEQUENCE`, podendo pular os
 *   pontos opcionais "pendente_*", nunca anda para trás nem cancela livremente.
 * - Staff (admin/gestor/assistente): pode forçar qualquer status, exceto sair de `entregue`
 *   (terminal) ou de `cancelada` sem passar por uma nova solicitação.
 * - Cliente: só pode cancelar (tratado separadamente em `cancelSolicitacao`), nunca
 *   força uma transição de status do fluxo operacional.
 */
export function canTransition(
  actorRole: Role,
  current: RequestStatus,
  target: RequestStatus,
): TransitionCheck {
  if (current === "entregue") {
    return { allowed: false, reason: "Entregue é um status terminal, não pode ser alterado." }
  }
  if (current === target) {
    return { allowed: false, reason: "A solicitação já está nesse status." }
  }

  if (target === "cancelada") {
    // cancelamento é tratado por cancelSolicitacao (exige motivo) — aqui só validamos
    // que a solicitação não é terminal, o que já foi checado acima.
    return { allowed: true }
  }

  if (isStaffRole(actorRole)) {
    return { allowed: true }
  }

  if (actorRole === "motorista") {
    const currentIndex = DRIVER_FORWARD_SEQUENCE.indexOf(current)
    const targetIndex = DRIVER_FORWARD_SEQUENCE.indexOf(target)

    if (currentIndex === -1 || targetIndex === -1) {
      return { allowed: false, reason: "Transição de status inválida para motorista." }
    }
    if (targetIndex <= currentIndex) {
      return {
        allowed: false,
        reason: "Motorista só pode avançar o status da entrega, nunca retroceder.",
      }
    }
    return { allowed: true }
  }

  return { allowed: false, reason: "Papel sem permissão para alterar o status." }
}
