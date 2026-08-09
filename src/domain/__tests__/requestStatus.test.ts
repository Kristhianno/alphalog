import { describe, expect, it } from "vitest"
import { canTransition, isActiveStatus, isClientEditableStatus } from "../requestStatus"

describe("canTransition", () => {
  it("permite motorista avançar na sequência", () => {
    expect(canTransition("motorista", "solicitada", "aceita").allowed).toBe(true)
    expect(canTransition("motorista", "aceita", "coletada").allowed).toBe(true) // pula pendente_coleta
    expect(canTransition("motorista", "em_rota", "entregue").allowed).toBe(true) // pula pendente_entrega
  })

  it("bloqueia motorista de retroceder", () => {
    expect(canTransition("motorista", "coletada", "aceita").allowed).toBe(false)
    expect(canTransition("motorista", "em_rota", "solicitada").allowed).toBe(false)
  })

  it("permite staff forçar qualquer transição, exceto a partir de entregue", () => {
    expect(canTransition("admin", "solicitada", "em_rota").allowed).toBe(true)
    expect(canTransition("gestor", "coletada", "aceita").allowed).toBe(true)
    expect(canTransition("admin", "entregue", "cancelada").allowed).toBe(false)
  })

  it("bloqueia cliente de forçar transições operacionais", () => {
    expect(canTransition("cliente", "solicitada", "aceita").allowed).toBe(false)
  })

  it("entregue é terminal para todo mundo", () => {
    expect(canTransition("admin", "entregue", "em_rota").allowed).toBe(false)
    expect(canTransition("motorista", "entregue", "em_rota").allowed).toBe(false)
  })
})

describe("isActiveStatus", () => {
  it("reconhece os status ativos do ciclo de entrega", () => {
    expect(isActiveStatus("aceita")).toBe(true)
    expect(isActiveStatus("em_rota")).toBe(true)
    expect(isActiveStatus("entregue")).toBe(false)
    expect(isActiveStatus("solicitada")).toBe(false)
    expect(isActiveStatus("cancelada")).toBe(false)
  })
})

describe("isClientEditableStatus", () => {
  it("cliente só edita enquanto agendada/solicitada", () => {
    expect(isClientEditableStatus("agendada")).toBe(true)
    expect(isClientEditableStatus("solicitada")).toBe(true)
    expect(isClientEditableStatus("aceita")).toBe(false)
  })
})
