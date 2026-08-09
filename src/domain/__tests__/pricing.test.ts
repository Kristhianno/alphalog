import { describe, expect, it } from "vitest"
import { resolveFreight } from "../pricing"
import { resolvePricingRegion } from "../regions"
import type { PrecoDeFrete } from "@/types/entities"

const priceTable: PrecoDeFrete[] = [
  {
    id: "p1",
    client_id: "c1",
    transport_type: "utilitario",
    region: "Região Central",
    price: 250,
    created_at: "",
  },
]

describe("resolvePricingRegion", () => {
  it("resolve a mesma região quando origem e destino coincidem", () => {
    expect(
      resolvePricingRegion("Rua A, Vale Novo", "Rua B, Serra Dourada"),
    ).toBe("Região Central")
  })

  it("escolhe a região mais cara (mais adiante na lista) quando origem e destino divergem", () => {
    // Central (index 0) x Sul (index 2) -> Sul vence
    expect(
      resolvePricingRegion("Rua A, Vale Novo", "Rua B, Monte Verde"),
    ).toBe("Região Sul")
  })

  it("retorna undefined se qualquer ponta não resolver para uma região conhecida", () => {
    expect(resolvePricingRegion("Rua Desconhecida, 123", "Rua B, Vale Novo")).toBeUndefined()
  })
})

describe("resolveFreight", () => {
  it("usa o preço da tabela quando não há override", () => {
    const result = resolveFreight({
      clientId: "c1",
      transportType: "utilitario",
      originAddress: "Rua A, Vale Novo",
      destinationAddress: "Rua B, Serra Dourada",
      priceTable,
    })
    expect(result.price).toBe(250)
    expect(result.isOverride).toBe(false)
  })

  it("freight_override sempre vence o valor da tabela", () => {
    const result = resolveFreight({
      clientId: "c1",
      transportType: "utilitario",
      originAddress: "Rua A, Vale Novo",
      destinationAddress: "Rua B, Serra Dourada",
      freightOverride: 999,
      priceTable,
    })
    expect(result.price).toBe(999)
    expect(result.isOverride).toBe(true)
  })

  it('retorna "a combinar" (undefined) quando a região não resolve', () => {
    const result = resolveFreight({
      clientId: "c1",
      transportType: "utilitario",
      originAddress: "Endereço fora da lista",
      destinationAddress: "Outro endereço desconhecido",
      priceTable,
    })
    expect(result.price).toBeUndefined()
  })

  it('retorna "a combinar" quando a região resolve mas não há preço cadastrado para a combinação', () => {
    const result = resolveFreight({
      clientId: "c1",
      transportType: "caminhao_grande",
      originAddress: "Rua A, Vale Novo",
      destinationAddress: "Rua B, Serra Dourada",
      priceTable,
    })
    expect(result.price).toBeUndefined()
    expect(result.region).toBe("Região Central")
  })
})
