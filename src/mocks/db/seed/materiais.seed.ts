import type { TipoDeMaterial } from "@/types/entities"
import { isoAtOffset } from "./dateHelpers"

export const SEED_MATERIAL_IDS = {
  eletronicos: "material-eletronicos",
  construcao: "material-construcao",
  alimentos: "material-alimentos",
  metais: "material-metais",
  farmaceuticos: "material-farmaceuticos",
  autopecas: "material-autopecas",
} as const

export function seedTiposDeMaterial(): TipoDeMaterial[] {
  const createdAt = isoAtOffset(-170)

  return [
    {
      id: SEED_MATERIAL_IDS.eletronicos,
      name: "Eletrônicos",
      description: "Equipamentos eletrônicos em geral, sensíveis a impacto e umidade.",
      requires_special_handling: true,
      created_at: createdAt,
    },
    {
      id: SEED_MATERIAL_IDS.construcao,
      name: "Materiais de construção",
      description: "Cimento, argamassa, ferragens e insumos de obra.",
      requires_special_handling: false,
      created_at: createdAt,
    },
    {
      id: SEED_MATERIAL_IDS.alimentos,
      name: "Alimentos não perecíveis",
      description: "Produtos alimentícios embalados, sem necessidade de refrigeração.",
      requires_special_handling: false,
      created_at: createdAt,
    },
    {
      id: SEED_MATERIAL_IDS.metais,
      name: "Peças metálicas",
      description: "Componentes e chapas metálicas, carga pesada.",
      requires_special_handling: false,
      created_at: createdAt,
    },
    {
      id: SEED_MATERIAL_IDS.farmaceuticos,
      name: "Produtos farmacêuticos",
      description: "Medicamentos e insumos de saúde — exige cuidado especial no manuseio.",
      requires_special_handling: true,
      created_at: createdAt,
    },
    {
      id: SEED_MATERIAL_IDS.autopecas,
      name: "Autopeças",
      description: "Peças e acessórios automotivos.",
      requires_special_handling: false,
      created_at: createdAt,
    },
  ]
}
