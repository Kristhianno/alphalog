import type { LocalizacaoMotorista } from "@/types/entities"
import { isoAtOffset } from "./dateHelpers"
import { SEED_DRIVER_IDS } from "./motoristas.seed"
import { SEED_LINKED_LOCATION_REQUEST_ID } from "./solicitacoes.seed"

/**
 * Única posição fictícia de motorista (rastreamento é só um exemplo estático, ver plano) —
 * João, a caminho de Serra Dourada para Vale Novo na entrega `em_rota` vinculada.
 */
export function seedLocalizacaoMotorista(): LocalizacaoMotorista[] {
  return [
    {
      id: "localizacao-joao",
      driver_id: SEED_DRIVER_IDS.joao,
      delivery_request_id: SEED_LINKED_LOCATION_REQUEST_ID,
      latitude: -23.575,
      longitude: -46.665,
      heading: 45,
      speed: 62,
      updated_at: isoAtOffset(0, new Date().getHours(), new Date().getMinutes()),
    },
  ]
}
