import type { LocalizacaoMotorista } from "@/types/entities"
import { getDB } from "../db/store"
import { simulateLatency } from "./shared/latency"

/**
 * Rastreamento é só um exemplo estático no protótipo (ver plano) — retorna a única
 * posição fictícia semeada para o motorista, sem nenhuma atualização ao vivo.
 */
export async function getLocalizacaoMotorista(
  driverId: string,
): Promise<LocalizacaoMotorista | undefined> {
  await simulateLatency()
  return getDB().localizacoes.find((l) => l.driver_id === driverId)
}

export async function listLocalizacoes(): Promise<LocalizacaoMotorista[]> {
  await simulateLatency()
  return getDB().localizacoes
}
