import type { LogCombustivel, RegistroManutencao, TrocaDeOleo } from "@/types/entities"

/**
 * KM atual de um veículo é sempre derivado (regra 6) — o maior valor de KM já
 * registrado entre abastecimentos, trocas de óleo e manutenções. Nunca um campo
 * editável diretamente.
 */
export function deriveCurrentKm(params: {
  vehicleId: string
  fuelLogs: LogCombustivel[]
  oilChanges: TrocaDeOleo[]
  maintenanceLogs: RegistroManutencao[]
}): number {
  const values: number[] = [
    ...params.fuelLogs
      .filter((l) => l.vehicle_id === params.vehicleId)
      .map((l) => l.km_final),
    ...params.oilChanges
      .filter((o) => o.vehicle_id === params.vehicleId)
      .map((o) => o.km_at_change),
    ...params.maintenanceLogs
      .filter((m) => m.vehicle_id === params.vehicleId)
      .map((m) => m.current_km),
  ]

  return values.length > 0 ? Math.max(...values) : 0
}

/** Retorna a troca de óleo mais recente do veículo (maior km_at_change), se houver. */
export function latestOilChange(
  vehicleId: string,
  oilChanges: TrocaDeOleo[],
): TrocaDeOleo | undefined {
  return oilChanges
    .filter((o) => o.vehicle_id === vehicleId)
    .sort((a, b) => b.km_at_change - a.km_at_change)[0]
}

/**
 * Alerta de troca de óleo vencida (regra 7): dispara quando o KM atual derivado
 * alcança ou ultrapassa o next_change_km do último registro de troca de óleo.
 */
export function isOilChangeOverdue(params: {
  currentKm: number
  vehicleId: string
  oilChanges: TrocaDeOleo[]
}): boolean {
  const latest = latestOilChange(params.vehicleId, params.oilChanges)
  if (!latest) return false
  return params.currentKm >= latest.next_change_km
}
