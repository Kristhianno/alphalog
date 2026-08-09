import type { TrocaDeOleo } from "@/types/entities"
import { dateOnlyAtOffset, isoAtOffset } from "./dateHelpers"
import { SEED_VEHICLE_IDS } from "./veiculos.seed"
import { SEED_DRIVER_IDS } from "./motoristas.seed"

interface OilSpec {
  vehicleId: string
  plate: string
  driverId: string
  daysAgo: number
  kmAtChange: number
  nextChangeKm: number
  oilType: string
  cost: number
}

/**
 * `utilitario1` é o veículo deliberadamente com a troca de óleo vencida (regra 7):
 * next_change_km = 35000, e o KM atual derivado (ver combustivel.seed.ts) já chegou a 36000.
 */
const specs: OilSpec[] = [
  { vehicleId: SEED_VEHICLE_IDS.moto1, plate: "RIO1A23", driverId: SEED_DRIVER_IDS.joao, daysAgo: 60, kmAtChange: 7500, nextChangeKm: 9000, oilType: "10W30 sintético", cost: 90 },
  { vehicleId: SEED_VEHICLE_IDS.moto2, plate: "RIO2B34", driverId: SEED_DRIVER_IDS.joao, daysAgo: 90, kmAtChange: 4800, nextChangeKm: 6000, oilType: "10W30 sintético", cost: 85 },
  { vehicleId: SEED_VEHICLE_IDS.utilitario1, plate: "SPA3C45", driverId: SEED_DRIVER_IDS.joao, daysAgo: 45, kmAtChange: 32000, nextChangeKm: 35000, oilType: "5W30 sintético", cost: 280 },
  { vehicleId: SEED_VEHICLE_IDS.utilitario2, plate: "SPB4D56", driverId: SEED_DRIVER_IDS.joao, daysAgo: 70, kmAtChange: 17000, nextChangeKm: 22000, oilType: "5W30 sintético", cost: 260 },
  { vehicleId: SEED_VEHICLE_IDS.caminhaoMedio1, plate: "SPC5E67", driverId: SEED_DRIVER_IDS.marcia, daysAgo: 50, kmAtChange: 79500, nextChangeKm: 90000, oilType: "15W40 mineral", cost: 620 },
  { vehicleId: SEED_VEHICLE_IDS.caminhaoMedio2, plate: "SPD6F78", driverId: SEED_DRIVER_IDS.marcia, daysAgo: 120, kmAtChange: 44000, nextChangeKm: 50000, oilType: "15W40 mineral", cost: 600 },
  { vehicleId: SEED_VEHICLE_IDS.caminhaoGrande1, plate: "SPE7G89", driverId: SEED_DRIVER_IDS.marcia, daysAgo: 60, kmAtChange: 149000, nextChangeKm: 160000, oilType: "15W40 mineral", cost: 890 },
  { vehicleId: SEED_VEHICLE_IDS.caminhaoGrande2, plate: "SPF8H90", driverId: SEED_DRIVER_IDS.marcia, daysAgo: 55, kmAtChange: 59500, nextChangeKm: 65000, oilType: "15W40 mineral", cost: 870 },
]

export function seedTrocasDeOleo(): TrocaDeOleo[] {
  return specs.map((spec, index) => ({
    id: `oleo-${index + 1}`,
    vehicle_id: spec.vehicleId,
    driver_id: spec.driverId,
    vehicle_plate: spec.plate,
    change_date: dateOnlyAtOffset(-spec.daysAgo),
    km_at_change: spec.kmAtChange,
    next_change_km: spec.nextChangeKm,
    oil_type: spec.oilType,
    service_cost: spec.cost,
    attachments: [],
    created_at: isoAtOffset(-spec.daysAgo),
  }))
}
