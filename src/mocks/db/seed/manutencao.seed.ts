import type { RegistroManutencao } from "@/types/entities"
import type { MaintenanceType } from "@/types/enums"
import { dateOnlyAtOffset, isoAtOffset } from "./dateHelpers"
import { SEED_VEHICLE_IDS } from "./veiculos.seed"
import { SEED_DRIVER_IDS } from "./motoristas.seed"

interface MaintenanceSpec {
  vehicleId: string
  plate: string
  driverId: string
  type: MaintenanceType
  daysAgo: number
  currentKm: number
  cost: number
  notes?: string
}

const specs: MaintenanceSpec[] = [
  { vehicleId: SEED_VEHICLE_IDS.moto1, plate: "RIO1A23", driverId: SEED_DRIVER_IDS.joao, type: "preventiva", daysAgo: 10, currentKm: 8100, cost: 120 },
  { vehicleId: SEED_VEHICLE_IDS.moto2, plate: "RIO2B34", driverId: SEED_DRIVER_IDS.joao, type: "corretiva", daysAgo: 2, currentKm: 5100, cost: 340, notes: "Troca do sistema de embreagem — veículo em manutenção." },
  { vehicleId: SEED_VEHICLE_IDS.utilitario1, plate: "SPA3C45", driverId: SEED_DRIVER_IDS.joao, type: "preventiva", daysAgo: 60, currentKm: 31500, cost: 210 },
  { vehicleId: SEED_VEHICLE_IDS.utilitario2, plate: "SPB4D56", driverId: SEED_DRIVER_IDS.joao, type: "preventiva", daysAgo: 5, currentKm: 19400, cost: 195 },
  { vehicleId: SEED_VEHICLE_IDS.caminhaoMedio1, plate: "SPC5E67", driverId: SEED_DRIVER_IDS.marcia, type: "preventiva", daysAgo: 20, currentKm: 81200, cost: 480 },
  { vehicleId: SEED_VEHICLE_IDS.caminhaoMedio2, plate: "SPD6F78", driverId: SEED_DRIVER_IDS.marcia, type: "corretiva", daysAgo: 95, currentKm: 45300, cost: 2100, notes: "Aguardando peça importada — veículo inativo até a conclusão." },
  { vehicleId: SEED_VEHICLE_IDS.caminhaoGrande1, plate: "SPE7G89", driverId: SEED_DRIVER_IDS.marcia, type: "preventiva", daysAgo: 25, currentKm: 151800, cost: 650 },
  { vehicleId: SEED_VEHICLE_IDS.caminhaoGrande1, plate: "SPE7G89", driverId: SEED_DRIVER_IDS.marcia, type: "corretiva", daysAgo: 40, currentKm: 150500, cost: 890 },
  { vehicleId: SEED_VEHICLE_IDS.caminhaoGrande2, plate: "SPF8H90", driverId: SEED_DRIVER_IDS.marcia, type: "preditiva", daysAgo: 8, currentKm: 62400, cost: 310, notes: "Sensor indicou desgaste acima do esperado nas pastilhas de freio." },
  { vehicleId: SEED_VEHICLE_IDS.moto1, plate: "RIO1A23", driverId: SEED_DRIVER_IDS.joao, type: "preditiva", daysAgo: 2, currentKm: 8300, cost: 60 },
]

export function seedRegistrosManutencao(): RegistroManutencao[] {
  return specs.map((spec, index) => ({
    id: `manutencao-${index + 1}`,
    vehicle_id: spec.vehicleId,
    driver_id: spec.driverId,
    vehicle_plate: spec.plate,
    maintenance_type: spec.type,
    current_km: spec.currentKm,
    service_cost: spec.cost,
    notes: spec.notes,
    maintenance_date: dateOnlyAtOffset(-spec.daysAgo),
    attachments: [],
    created_at: isoAtOffset(-spec.daysAgo),
    updated_at: isoAtOffset(-spec.daysAgo),
  }))
}
