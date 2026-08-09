import type { ChecklistItemResposta, ChecklistVeiculo } from "@/types/entities"

/** Itens fixos do grupo "materiais obrigatórios a bordo" (regra 8, doc/08 lista sugerida). */
export const MATERIALS_CHECKLIST_ITEMS = [
  "Triângulo de sinalização",
  "Macaco e chave de roda",
  "Extintor de incêndio",
  "Documentos do veículo",
  "Cones de sinalização",
  "Colete refletivo",
] as const

/** Itens fixos do grupo "condição do veículo" (regra 8). */
export const VEHICLE_CHECKLIST_ITEMS = [
  "Pneus (incluindo estepe)",
  "Freios",
  "Luzes e setas",
  "Cinto de segurança",
  "Nível de óleo e fluidos",
  "Limpadores de para-brisa",
] as const

export function buildEmptyChecklistGroup(
  items: readonly string[],
): ChecklistItemResposta[] {
  return items.map((label, index) => ({
    id: `item-${index}`,
    label,
    status: "",
  }))
}

/** Conta quantos itens de um grupo foram respondidos "não". */
export function countNegativeAnswers(items: ChecklistItemResposta[]): number {
  return items.filter((item) => item.status === "nao").length
}

/**
 * Um checklist deve ser destacado na visão da administração quando tem vários itens
 * "não" somados entre os dois grupos (regra 8) — o limiar é deliberadamente baixo (2)
 * para priorizar acompanhamento cedo.
 */
export function isChecklistFlagged(checklist: ChecklistVeiculo): boolean {
  return (
    countNegativeAnswers(checklist.materiais) + countNegativeAnswers(checklist.veiculo) >=
    2
  )
}

export function totalNegativeAnswers(checklist: ChecklistVeiculo): number {
  return countNegativeAnswers(checklist.materiais) + countNegativeAnswers(checklist.veiculo)
}
