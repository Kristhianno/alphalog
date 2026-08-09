import type { LogCombustivel } from "@/types/entities"
import type { FuelType } from "@/types/enums"
import { dateOnlyAtOffset, isoAtOffset } from "./dateHelpers"
import { SEED_VEHICLE_IDS } from "./veiculos.seed"
import { SEED_DRIVER_IDS } from "./motoristas.seed"

const FUEL_PRICE_BY_TYPE: Record<FuelType, number> = {
  gasolina: 5.89,
  alcool: 3.99,
  diesel: 6.29,
  gnv: 4.49,
}

interface FuelSpec {
  vehicleId: string
  plate: string
  driverId: string
  fuelType: FuelType
  daysAgo: number
  kmInitial: number
  kmFinal: number
  liters: number
}

const specs: FuelSpec[] = [
  { vehicleId: SEED_VEHICLE_IDS.moto1, plate: "RIO1A23", driverId: SEED_DRIVER_IDS.joao, fuelType: "gasolina", daysAgo: 15, kmInitial: 8000, kmFinal: 8120, liters: 5.5 },
  { vehicleId: SEED_VEHICLE_IDS.moto1, plate: "RIO1A23", driverId: SEED_DRIVER_IDS.joao, fuelType: "gasolina", daysAgo: 5, kmInitial: 8120, kmFinal: 8300, liters: 6.2 },
  { vehicleId: SEED_VEHICLE_IDS.moto2, plate: "RIO2B34", driverId: SEED_DRIVER_IDS.joao, fuelType: "alcool", daysAgo: 20, kmInitial: 5000, kmFinal: 5100, liters: 4.8 },
  { vehicleId: SEED_VEHICLE_IDS.utilitario1, plate: "SPA3C45", driverId: SEED_DRIVER_IDS.joao, fuelType: "gasolina", daysAgo: 40, kmInitial: 32000, kmFinal: 32800, liters: 62 },
  { vehicleId: SEED_VEHICLE_IDS.utilitario1, plate: "SPA3C45", driverId: SEED_DRIVER_IDS.joao, fuelType: "gasolina", daysAgo: 25, kmInitial: 32800, kmFinal: 33900, liters: 88 },
  { vehicleId: SEED_VEHICLE_IDS.utilitario1, plate: "SPA3C45", driverId: SEED_DRIVER_IDS.joao, fuelType: "gasolina", daysAgo: 10, kmInitial: 33900, kmFinal: 35200, liters: 104 },
  { vehicleId: SEED_VEHICLE_IDS.utilitario1, plate: "SPA3C45", driverId: SEED_DRIVER_IDS.joao, fuelType: "gasolina", daysAgo: 3, kmInitial: 35200, kmFinal: 36000, liters: 65 },
  { vehicleId: SEED_VEHICLE_IDS.utilitario2, plate: "SPB4D56", driverId: SEED_DRIVER_IDS.joao, fuelType: "gasolina", daysAgo: 30, kmInitial: 18000, kmFinal: 18600, liters: 48 },
  { vehicleId: SEED_VEHICLE_IDS.utilitario2, plate: "SPB4D56", driverId: SEED_DRIVER_IDS.joao, fuelType: "gasolina", daysAgo: 12, kmInitial: 18600, kmFinal: 19400, liters: 66 },
  { vehicleId: SEED_VEHICLE_IDS.caminhaoMedio1, plate: "SPC5E67", driverId: SEED_DRIVER_IDS.marcia, fuelType: "diesel", daysAgo: 35, kmInitial: 80000, kmFinal: 80900, liters: 220 },
  { vehicleId: SEED_VEHICLE_IDS.caminhaoMedio1, plate: "SPC5E67", driverId: SEED_DRIVER_IDS.marcia, fuelType: "diesel", daysAgo: 15, kmInitial: 80900, kmFinal: 82000, liters: 245 },
  { vehicleId: SEED_VEHICLE_IDS.caminhaoMedio1, plate: "SPC5E67", driverId: SEED_DRIVER_IDS.marcia, fuelType: "diesel", daysAgo: 5, kmInitial: 82000, kmFinal: 83100, liters: 238 },
  { vehicleId: SEED_VEHICLE_IDS.caminhaoMedio2, plate: "SPD6F78", driverId: SEED_DRIVER_IDS.marcia, fuelType: "diesel", daysAgo: 100, kmInitial: 45000, kmFinal: 45300, liters: 130 },
  { vehicleId: SEED_VEHICLE_IDS.caminhaoGrande1, plate: "SPE7G89", driverId: SEED_DRIVER_IDS.marcia, fuelType: "diesel", daysAgo: 45, kmInitial: 150000, kmFinal: 151200, liters: 410 },
  { vehicleId: SEED_VEHICLE_IDS.caminhaoGrande1, plate: "SPE7G89", driverId: SEED_DRIVER_IDS.marcia, fuelType: "diesel", daysAgo: 20, kmInitial: 151200, kmFinal: 152500, liters: 455 },
  { vehicleId: SEED_VEHICLE_IDS.caminhaoGrande1, plate: "SPE7G89", driverId: SEED_DRIVER_IDS.marcia, fuelType: "diesel", daysAgo: 6, kmInitial: 152500, kmFinal: 153900, liters: 480 },
  { vehicleId: SEED_VEHICLE_IDS.caminhaoGrande2, plate: "SPF8H90", driverId: SEED_DRIVER_IDS.marcia, fuelType: "diesel", daysAgo: 38, kmInitial: 60000, kmFinal: 61100, liters: 390 },
  { vehicleId: SEED_VEHICLE_IDS.caminhaoGrande2, plate: "SPF8H90", driverId: SEED_DRIVER_IDS.marcia, fuelType: "diesel", daysAgo: 15, kmInitial: 61100, kmFinal: 62400, liters: 445 },
]

export function seedLogsCombustivel(): LogCombustivel[] {
  return specs.map((spec, index) => {
    const fuelPrice = FUEL_PRICE_BY_TYPE[spec.fuelType]
    return {
      id: `combustivel-${index + 1}`,
      vehicle_id: spec.vehicleId,
      driver_id: spec.driverId,
      vehicle_plate: spec.plate,
      log_date: dateOnlyAtOffset(-spec.daysAgo),
      km_initial: spec.kmInitial,
      km_final: spec.kmFinal,
      liters: spec.liters,
      fuel_price: fuelPrice,
      fuel_type: spec.fuelType,
      attachments: [],
      created_at: isoAtOffset(-spec.daysAgo),
      updated_at: isoAtOffset(-spec.daysAgo),
    }
  })
}

export function fuelTotalCost(log: Pick<LogCombustivel, "liters" | "fuel_price">): number {
  return Math.round(log.liters * log.fuel_price * 100) / 100
}
