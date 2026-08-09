import type { PrecoDeFrete } from "@/types/entities"
import type { VehicleType } from "@/types/enums"
import { REGIONS } from "@/domain/regions"
import { isoAtOffset } from "./dateHelpers"
import { SEED_CLIENT_IDS } from "./clientes.seed"

const BASE_PRICE_BY_TYPE: Record<VehicleType, number> = {
  moto: 80,
  utilitario: 220,
  caminhao_medio: 650,
  caminhao_grande: 1400,
}

const REGION_MULTIPLIER: Record<string, number> = {
  "Região Central": 1.0,
  "Região Norte": 1.15,
  "Região Sul": 1.35,
}

function priceFor(type: VehicleType, region: string): number {
  return Math.round((BASE_PRICE_BY_TYPE[type] * REGION_MULTIPLIER[region]) / 5) * 5
}

/**
 * Tabela de preços deliberadamente incompleta (regra 5): cada cliente só tem preço
 * cadastrado para a própria região "de casa", nos 4 tipos de veículo — qualquer
 * solicitação cruzando para outra região sem preço mostra "a combinar" na tela,
 * reforçando o caso já coberto pelo endereço não resolvido em solicitacoes.seed.ts.
 */
export function seedPrecosDeFrete(): PrecoDeFrete[] {
  const createdAt = isoAtOffset(-150)
  const vehicleTypes = Object.keys(BASE_PRICE_BY_TYPE) as VehicleType[]

  const clientHomeRegion: Record<string, string> = {
    [SEED_CLIENT_IDS.mendes]: "Região Central",
    [SEED_CLIENT_IDS.construplus]: "Região Norte",
    [SEED_CLIENT_IDS.boaVista]: "Região Norte",
    [SEED_CLIENT_IDS.serraDourada]: "Região Central",
    [SEED_CLIENT_IDS.monteVerde]: "Região Sul",
    [SEED_CLIENT_IDS.rioBonito]: "Região Sul",
  }

  const rows: PrecoDeFrete[] = []
  let counter = 0

  for (const [clientId, region] of Object.entries(clientHomeRegion)) {
    for (const type of vehicleTypes) {
      counter += 1
      rows.push({
        id: `preco-${counter}`,
        client_id: clientId,
        transport_type: type,
        region,
        price: priceFor(type, region),
        created_at: createdAt,
      })
    }
  }

  return rows
}

export const SEED_REGION_NAMES = REGIONS.map((r) => r.region)
