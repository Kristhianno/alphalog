import { describe, expect, it } from "vitest"
import { deriveCurrentKm, isOilChangeOverdue } from "../vehicleKm"
import type { LogCombustivel, RegistroManutencao, TrocaDeOleo } from "@/types/entities"

const fuelLogs = [
  { vehicle_id: "v1", km_final: 10000 },
  { vehicle_id: "v1", km_final: 10500 },
  { vehicle_id: "v2", km_final: 99999 },
] as LogCombustivel[]

const oilChanges = [{ vehicle_id: "v1", km_at_change: 10200, next_change_km: 15000 }] as TrocaDeOleo[]

const maintenanceLogs = [{ vehicle_id: "v1", current_km: 10100 }] as RegistroManutencao[]

describe("deriveCurrentKm", () => {
  it("retorna o maior km entre abastecimento/óleo/manutenção do veículo, ignorando outros veículos", () => {
    const km = deriveCurrentKm({ vehicleId: "v1", fuelLogs, oilChanges, maintenanceLogs })
    expect(km).toBe(10500)
  })

  it("retorna 0 quando o veículo não tem nenhum registro", () => {
    const km = deriveCurrentKm({
      vehicleId: "v-sem-registro",
      fuelLogs,
      oilChanges,
      maintenanceLogs,
    })
    expect(km).toBe(0)
  })
})

describe("isOilChangeOverdue", () => {
  it("não está vencido quando km atual é menor que next_change_km", () => {
    expect(isOilChangeOverdue({ currentKm: 12000, vehicleId: "v1", oilChanges })).toBe(false)
  })

  it("está vencido quando km atual alcança ou ultrapassa next_change_km", () => {
    expect(isOilChangeOverdue({ currentKm: 15000, vehicleId: "v1", oilChanges })).toBe(true)
    expect(isOilChangeOverdue({ currentKm: 16000, vehicleId: "v1", oilChanges })).toBe(true)
  })

  it("não está vencido quando não há troca de óleo registrada", () => {
    expect(
      isOilChangeOverdue({ currentKm: 99999, vehicleId: "sem-troca", oilChanges }),
    ).toBe(false)
  })
})
