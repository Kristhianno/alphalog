import type { PrecoDeFrete } from "@/types/entities"
import type { VehicleType } from "@/types/enums"
import { resolvePricingRegion } from "./regions"

export interface FreightResolution {
  /** undefined significa "a combinar" — região não resolvida ou sem preço cadastrado */
  price?: number
  region?: string
  /** true quando o valor veio de freight_override em vez da tabela */
  isOverride: boolean
}

/**
 * Resolve o preço do frete por cliente x tipo de veículo x região (regra 5).
 * `freight_override`, quando definido, sempre tem prioridade sobre o valor da tabela.
 */
export function resolveFreight(params: {
  clientId: string
  transportType: VehicleType
  originAddress: string
  destinationAddress: string
  freightOverride?: number
  priceTable: PrecoDeFrete[]
}): FreightResolution {
  const region = resolvePricingRegion(params.originAddress, params.destinationAddress)

  if (params.freightOverride != null) {
    return { price: params.freightOverride, region, isOverride: true }
  }

  if (!region) {
    return { price: undefined, region: undefined, isOverride: false }
  }

  const match = params.priceTable.find(
    (p) =>
      p.client_id === params.clientId &&
      p.transport_type === params.transportType &&
      p.region === region,
  )

  return { price: match?.price, region, isOverride: false }
}
