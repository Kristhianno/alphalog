import { describe, expect, it } from "vitest"
import {
  getAvailableRequestsForDriver,
  isDriverAvailable,
  isDriverOnline,
} from "../driverAvailability"
import type { Motorista, Solicitacao } from "@/types/entities"

const requests = [
  { id: "r1", driver_id: "d1", status: "em_rota", transport_type: "utilitario" },
  { id: "r2", driver_id: undefined, status: "solicitada", transport_type: "utilitario" },
  { id: "r3", driver_id: undefined, status: "solicitada", transport_type: "moto" },
  { id: "r4", driver_id: "d2", status: "entregue", transport_type: "utilitario" },
] as Solicitacao[]

describe("isDriverOnline / isDriverAvailable", () => {
  it('motorista com entrega em status ativo está "online" e indisponível', () => {
    expect(isDriverOnline("d1", requests)).toBe(true)
    expect(isDriverAvailable("d1", requests)).toBe(false)
  })

  it('motorista sem entrega ativa está "offline" e disponível', () => {
    expect(isDriverOnline("d2", requests)).toBe(false) // a única entrega dele já foi entregue
    expect(isDriverAvailable("d2", requests)).toBe(true)
  })
})

describe("getAvailableRequestsForDriver", () => {
  it("só retorna solicitações sem motorista, com tipo de veículo compatível", () => {
    const driver = { id: "d3", enabled_vehicle_types: ["utilitario"] } as Motorista
    const available = getAvailableRequestsForDriver(driver, requests)
    expect(available.map((r) => r.id)).toEqual(["r2"])
  })

  it("motorista habilitado em mais de um tipo vê todas as compatíveis", () => {
    const driver = { id: "d3", enabled_vehicle_types: ["utilitario", "moto"] } as Motorista
    const available = getAvailableRequestsForDriver(driver, requests)
    expect(available.map((r) => r.id).sort()).toEqual(["r2", "r3"])
  })
})
