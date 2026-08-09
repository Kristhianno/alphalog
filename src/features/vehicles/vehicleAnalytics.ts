import { resolveFreight } from "@/domain/pricing"
import type {
  LogCombustivel,
  PrecoDeFrete,
  RegistroManutencao,
  Solicitacao,
  TrocaDeOleo,
  Veiculo,
} from "@/types/entities"
import type { VehicleType } from "@/types/enums"

export interface VehicleCostDatum {
  plate: string
  combustivel: number
  oleo: number
  manutencao: number
}

export function buildCostByVehicle(
  veiculos: Veiculo[],
  fuel: LogCombustivel[],
  oil: TrocaDeOleo[],
  maintenance: RegistroManutencao[],
): VehicleCostDatum[] {
  return veiculos.map((v) => ({
    plate: v.plate,
    combustivel: fuel.filter((l) => l.vehicle_id === v.id).reduce((sum, l) => sum + l.liters * l.fuel_price, 0),
    oleo: oil.filter((l) => l.vehicle_id === v.id).reduce((sum, l) => sum + l.service_cost, 0),
    manutencao: maintenance.filter((l) => l.vehicle_id === v.id).reduce((sum, l) => sum + l.service_cost, 0),
  }))
}

export interface VehicleFreightDatum {
  plate: string
  frete: number
}

export function buildFreightByVehicle(
  veiculos: Veiculo[],
  solicitacoes: Solicitacao[],
  precos: PrecoDeFrete[],
): VehicleFreightDatum[] {
  return veiculos.map((v) => {
    const delivered = solicitacoes.filter((r) => r.vehicle_id === v.id && r.status === "entregue")
    const total = delivered.reduce((sum, r) => {
      const { price } = resolveFreight({
        clientId: r.client_id,
        transportType: r.transport_type,
        originAddress: r.origin_address,
        destinationAddress: r.destination_address,
        freightOverride: r.freight_override,
        priceTable: precos,
      })
      return sum + (price ?? 0)
    }, 0)
    return { plate: v.plate, frete: total }
  })
}

export interface VolumeByTypeDatum {
  month: string
  moto: number
  utilitario: number
  caminhao_medio: number
  caminhao_grande: number
}

export function buildVolumeByTypeOverTime(solicitacoes: Solicitacao[]): VolumeByTypeDatum[] {
  const buckets = new Map<string, Record<VehicleType, number>>()
  for (const r of solicitacoes) {
    const month = r.created_at.slice(0, 7)
    if (!buckets.has(month)) {
      buckets.set(month, { moto: 0, utilitario: 0, caminhao_medio: 0, caminhao_grande: 0 })
    }
    buckets.get(month)![r.transport_type]++
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, counts]) => ({ month, ...counts }))
}