import { ApiError } from "./errors"
import { isStaff, type Actor } from "./actor"

/**
 * "Regra do dono" (doc/02): tabelas operacionais do motorista só são visíveis/editáveis
 * por quem criou o registro ou pela administração — nunca por outro motorista.
 */
export function assertOwnerOrStaff(
  recordDriverId: string,
  actor: Actor,
  message = "Você só pode gerenciar os próprios registros.",
): void {
  if (isStaff(actor)) return
  if (actor.role === "motorista" && actor.driverId === recordDriverId) return
  throw new ApiError("FORBIDDEN", message)
}

export function visibleToActor<T extends { driver_id: string }>(
  records: T[],
  actor: Actor,
): T[] {
  if (isStaff(actor)) return records
  if (actor.role === "motorista") {
    return records.filter((r) => r.driver_id === actor.driverId)
  }
  return []
}
