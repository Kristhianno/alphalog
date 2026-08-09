import type { Motorista, Solicitacao } from "@/types/entities"
import { isActiveStatus } from "./requestStatus"

/**
 * Disponibilidade do motorista nunca é um campo fixo (regra 3): é "indisponível" se
 * ele já tiver qualquer entrega em um dos status ativos, "disponível" caso contrário.
 * O mesmo cálculo também define o indicador "online/offline" da visão da administração
 * (doc/04 seção 7 — "online" = ter ao menos uma entrega ativa no momento).
 */
export function isDriverOnline(driverId: string, requests: Solicitacao[]): boolean {
  return requests.some((r) => r.driver_id === driverId && isActiveStatus(r.status))
}

export function isDriverAvailable(driverId: string, requests: Solicitacao[]): boolean {
  return !isDriverOnline(driverId, requests)
}

/**
 * Solicitações "disponíveis" para um motorista: status `solicitada`, ainda sem
 * motorista, e cujo transport_type bate com algum tipo de veículo habilitado do motorista.
 */
export function getAvailableRequestsForDriver(
  driver: Motorista,
  requests: Solicitacao[],
): Solicitacao[] {
  return requests.filter(
    (r) =>
      r.status === "solicitada" &&
      !r.driver_id &&
      driver.enabled_vehicle_types.includes(r.transport_type),
  )
}

/** Solicitações já atribuídas a este motorista (qualquer status ativo ou concluído). */
export function getOwnRequestsForDriver(
  driverId: string,
  requests: Solicitacao[],
): Solicitacao[] {
  return requests.filter((r) => r.driver_id === driverId)
}
