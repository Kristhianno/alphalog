import { describe, expect, it } from "vitest"
import { buildSeedDatabase } from "../index"
import { deriveCurrentKm, isOilChangeOverdue } from "@/domain/vehicleKm"
import { isChecklistFlagged } from "@/domain/checklist"
import { isDriverOnline } from "@/domain/driverAvailability"
import { SEED_DRIVER_IDS } from "../motoristas.seed"
import { SEED_VEHICLE_IDS } from "../veiculos.seed"

describe("buildSeedDatabase — integridade referencial", () => {
  const db = buildSeedDatabase()

  it("todo papel referencia um usuário existente", () => {
    const userIds = new Set(db.usuarios.map((u) => u.id))
    for (const papel of db.papeis) {
      expect(userIds.has(papel.user_id)).toBe(true)
    }
  })

  it("todo usuário tem exatamente um papel", () => {
    expect(db.papeis).toHaveLength(db.usuarios.length)
  })

  it("toda solicitação referencia cliente, material e (quando definido) motorista/veículo existentes", () => {
    const clientIds = new Set(db.clientes.map((c) => c.id))
    const materialIds = new Set(db.tiposMaterial.map((m) => m.id))
    const driverIds = new Set(db.motoristas.map((m) => m.id))
    const vehicleIds = new Set(db.veiculos.map((v) => v.id))

    for (const s of db.solicitacoes) {
      expect(clientIds.has(s.client_id)).toBe(true)
      expect(materialIds.has(s.material_type_id)).toBe(true)
      if (s.driver_id) expect(driverIds.has(s.driver_id)).toBe(true)
      if (s.vehicle_id) expect(vehicleIds.has(s.vehicle_id)).toBe(true)
    }
  })

  it("request_number é único e sequencial crescente", () => {
    const numbers = db.solicitacoes.map((s) => s.request_number)
    expect(new Set(numbers).size).toBe(numbers.length)
  })

  it("toda entrada de histórico referencia uma solicitação existente", () => {
    const requestIds = new Set(db.solicitacoes.map((s) => s.id))
    for (const h of db.historicoStatus) {
      expect(requestIds.has(h.delivery_request_id)).toBe(true)
    }
  })

  it("toda solicitação que passou por 'coletada' tem ao menos um anexo (regra 2)", () => {
    for (const s of db.solicitacoes) {
      const history = db.historicoStatus.filter((h) => h.delivery_request_id === s.id)
      const passedByColeta = history.some((h) => h.status === "coletada")
      if (passedByColeta) {
        expect(s.attachments.length).toBeGreaterThan(0)
      }
    }
  })

  it("existe ao menos uma solicitação 'a combinar' (região não resolvida)", () => {
    const unresolved = db.solicitacoes.filter(
      (s) => s.status !== "cancelada" && s.status !== "agendada" && !s.region,
    )
    expect(unresolved.length).toBeGreaterThan(0)
  })

  it("existe ao menos uma solicitação com freight_override definido", () => {
    expect(db.solicitacoes.some((s) => s.freight_override != null)).toBe(true)
  })

  it("existe ao menos uma solicitação 'agendada' com data já no passado (dispara o agendador)", () => {
    const now = Date.now()
    const pending = db.solicitacoes.some(
      (s) => s.status === "agendada" && s.scheduled_date && new Date(s.scheduled_date).getTime() <= now,
    )
    expect(pending).toBe(true)
  })

  it("o veículo utilitario1 está deliberadamente com a troca de óleo vencida (regra 7)", () => {
    const currentKm = deriveCurrentKm({
      vehicleId: SEED_VEHICLE_IDS.utilitario1,
      fuelLogs: db.combustivel,
      oilChanges: db.oleo,
      maintenanceLogs: db.manutencao,
    })
    expect(
      isOilChangeOverdue({ currentKm, vehicleId: SEED_VEHICLE_IDS.utilitario1, oilChanges: db.oleo }),
    ).toBe(true)
  })

  it("existe ao menos um checklist sinalizado (2+ respostas negativas)", () => {
    expect(db.checklists.some((c) => isChecklistFlagged(c))).toBe(true)
  })

  it("o motorista João está online (tem uma entrega em rota) e a localização fictícia aponta para ele", () => {
    expect(isDriverOnline(SEED_DRIVER_IDS.joao, db.solicitacoes)).toBe(true)
    const location = db.localizacoes.find((l) => l.driver_id === SEED_DRIVER_IDS.joao)
    expect(location).toBeDefined()
    expect(location?.delivery_request_id).toBeDefined()
  })

  it("todo log de combustível/óleo/manutenção referencia um veículo e motorista existentes", () => {
    const vehicleIds = new Set(db.veiculos.map((v) => v.id))
    const driverIds = new Set(db.motoristas.map((m) => m.id))
    for (const log of [...db.combustivel, ...db.oleo, ...db.manutencao, ...db.checklists]) {
      expect(vehicleIds.has(log.vehicle_id)).toBe(true)
      expect(driverIds.has(log.driver_id)).toBe(true)
    }
  })

  it("preco_de_frete é único por (cliente, tipo, região)", () => {
    const keys = db.precos.map((p) => `${p.client_id}|${p.transport_type}|${p.region}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
