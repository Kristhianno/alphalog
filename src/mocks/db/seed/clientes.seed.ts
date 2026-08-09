import type { Cliente } from "@/types/entities"
import { isoAtOffset } from "./dateHelpers"
import { SEED_USER_IDS } from "./usuarios.seed"

export const SEED_CLIENT_IDS = {
  mendes: "cliente-mendes",
  construplus: "cliente-construplus",
  boaVista: "cliente-boavista",
  serraDourada: "cliente-serradourada",
  monteVerde: "cliente-monteverde",
  rioBonito: "cliente-riobonito",
} as const

export function seedClientes(): Cliente[] {
  const createdAt = isoAtOffset(-170)

  const clientes: Cliente[] = [
    {
      id: SEED_CLIENT_IDS.mendes,
      name: "Mendes Distribuidora Ltda",
      email: "contato@mendesdistribuidora.com.br",
      phone: "(11) 3211-4455",
      document: "12.345.678/0001-90",
      address: "Av. das Indústrias, 1200",
      city: "Vale Novo",
      state: "SP",
      zip_code: "01000-000",
      region: "Região Central",
      linked_user_email: "roberto.mendes@transportesloja.com.br",
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: SEED_CLIENT_IDS.construplus,
      name: "Construplus Materiais de Construção",
      email: "compras@construplus.com.br",
      phone: "(11) 3322-5566",
      document: "23.456.789/0001-11",
      address: "Rod. dos Materiais, km 12",
      city: "Porto Claro",
      state: "SP",
      zip_code: "02000-000",
      region: "Região Norte",
      linked_user_email: "juliana.barreto@construplus.com.br",
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: SEED_CLIENT_IDS.boaVista,
      name: "Comercial Boa Vista Alimentos",
      email: "logistica@boavistaalimentos.com.br",
      phone: "(11) 3433-6677",
      document: "34.567.890/0001-22",
      address: "Rua dos Alimentos, 340",
      city: "Boa Vista do Rio",
      state: "SP",
      zip_code: "02100-000",
      region: "Região Norte",
      notes: "Prioriza entregas no período da manhã.",
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: SEED_CLIENT_IDS.serraDourada,
      name: "Indústria Serra Dourada Metais",
      email: "expedicao@serradouradametais.com.br",
      phone: "(11) 3544-7788",
      document: "45.678.901/0001-33",
      address: "Distrito Industrial, lote 45",
      city: "Serra Dourada",
      state: "SP",
      zip_code: "01100-000",
      region: "Região Central",
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: SEED_CLIENT_IDS.monteVerde,
      name: "Farmacêutica Monte Verde S.A.",
      email: "operacoes@monteverdefarma.com.br",
      phone: "(11) 3655-8899",
      document: "56.789.012/0001-44",
      address: "Rua da Saúde, 88",
      city: "Monte Verde",
      state: "SP",
      zip_code: "03000-000",
      region: "Região Sul",
      notes: "Carga sensível — exige cuidado especial em parte dos pedidos.",
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: SEED_CLIENT_IDS.rioBonito,
      name: "Auto Peças Rio Bonito",
      email: "pecas@autopecasriobonito.com.br",
      phone: "(11) 3766-9900",
      document: "67.890.123/0001-55",
      address: "Av. dos Automóveis, 500",
      city: "Rio Bonito",
      state: "SP",
      zip_code: "03100-000",
      region: "Região Sul",
      created_at: createdAt,
      updated_at: createdAt,
    },
  ]

  return clientes
}

/** referência cruzada mantida aqui só para deixar explícito o vínculo cliente <-> conta de login */
export const CLIENT_USER_LINKS: Record<string, string> = {
  [SEED_CLIENT_IDS.mendes]: SEED_USER_IDS.clienteRoberto,
  [SEED_CLIENT_IDS.construplus]: SEED_USER_IDS.clienteJuliana,
}
