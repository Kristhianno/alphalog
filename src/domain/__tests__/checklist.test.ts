import { describe, expect, it } from "vitest"
import {
  buildEmptyChecklistGroup,
  countNegativeAnswers,
  isChecklistFlagged,
  MATERIALS_CHECKLIST_ITEMS,
} from "../checklist"
import type { ChecklistVeiculo } from "@/types/entities"

describe("buildEmptyChecklistGroup", () => {
  it("cria um item por rótulo, todos em branco", () => {
    const group = buildEmptyChecklistGroup(MATERIALS_CHECKLIST_ITEMS)
    expect(group).toHaveLength(MATERIALS_CHECKLIST_ITEMS.length)
    expect(group.every((item) => item.status === "")).toBe(true)
  })
})

describe("countNegativeAnswers / isChecklistFlagged", () => {
  it('conta itens "não" corretamente', () => {
    const items = [
      { id: "1", label: "a", status: "nao" as const },
      { id: "2", label: "b", status: "sim" as const },
      { id: "3", label: "c", status: "nao" as const },
    ]
    expect(countNegativeAnswers(items)).toBe(2)
  })

  it("sinaliza checklist com 2+ respostas negativas somadas entre os grupos", () => {
    const checklist = {
      materiais: [
        { id: "1", label: "a", status: "nao" as const },
        { id: "2", label: "b", status: "sim" as const },
      ],
      veiculo: [{ id: "3", label: "c", status: "nao" as const }],
    } as ChecklistVeiculo
    expect(isChecklistFlagged(checklist)).toBe(true)
  })

  it("não sinaliza checklist com no máximo 1 resposta negativa", () => {
    const checklist = {
      materiais: [{ id: "1", label: "a", status: "nao" as const }],
      veiculo: [{ id: "2", label: "b", status: "sim" as const }],
    } as ChecklistVeiculo
    expect(isChecklistFlagged(checklist)).toBe(false)
  })
})
