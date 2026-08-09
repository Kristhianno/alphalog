import { describe, expect, it } from "vitest"
import { computeLunchDurationMinutes, formatDurationMinutes } from "../lunchBreak"

describe("computeLunchDurationMinutes", () => {
  it("calcula a diferença em minutos entre saída e retorno", () => {
    expect(computeLunchDurationMinutes("12:00", "13:00")).toBe(60)
    expect(computeLunchDurationMinutes("12:00", "12:45")).toBe(45)
  })

  it("retorna undefined quando ainda não houve retorno", () => {
    expect(computeLunchDurationMinutes("12:00", undefined)).toBeUndefined()
  })

  it("retorna undefined para um retorno antes da saída (dado inconsistente)", () => {
    expect(computeLunchDurationMinutes("13:00", "12:00")).toBeUndefined()
  })
})

describe("formatDurationMinutes", () => {
  it("formata só minutos quando < 1h", () => {
    expect(formatDurationMinutes(45)).toBe("45min")
  })

  it("formata horas e minutos", () => {
    expect(formatDurationMinutes(90)).toBe("1h 30min")
    expect(formatDurationMinutes(60)).toBe("1h")
  })
})
