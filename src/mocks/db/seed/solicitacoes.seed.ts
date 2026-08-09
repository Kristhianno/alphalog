import type { Attachment, HistoricoStatusSolicitacao, Solicitacao } from "@/types/entities"
import type { PaymentMethod, RequestStatus, VehicleType } from "@/types/enums"
import { DRIVER_FORWARD_SEQUENCE } from "@/types/enums"
import { resolvePricingRegion } from "@/domain/regions"
import { generateId } from "../ids"
import { atOffset } from "./dateHelpers"
import { SEED_CLIENT_IDS, CLIENT_USER_LINKS } from "./clientes.seed"
import { SEED_MATERIAL_IDS } from "./materiais.seed"
import { SEED_VEHICLE_IDS } from "./veiculos.seed"
import { SEED_DRIVER_IDS } from "./motoristas.seed"
import { SEED_USER_IDS } from "./usuarios.seed"

const DRIVER_USER_BY_DRIVER_ID: Record<string, string> = {
  [SEED_DRIVER_IDS.joao]: SEED_USER_IDS.motoristaJoao,
  [SEED_DRIVER_IDS.marcia]: SEED_USER_IDS.motoristaMarcia,
}

const ACTOR_NAMES: Record<string, string> = {
  [SEED_USER_IDS.admin]: "Ana Beatriz Ramos",
  [SEED_USER_IDS.gestor]: "Carlos Eduardo Lima",
  [SEED_USER_IDS.assistente]: "Fernanda Souza Alves",
  [SEED_USER_IDS.motoristaJoao]: "João Pedro Nascimento",
  [SEED_USER_IDS.motoristaMarcia]: "Márcia Helena Duarte",
  [SEED_USER_IDS.clienteRoberto]: "Roberto Carlos Mendes",
  [SEED_USER_IDS.clienteJuliana]: "Juliana Paes Barreto",
}

/** Cidade deliberadamente fora da lista conhecida — força o caso "a combinar" (regra 5). */
const UNRESOLVED_ADDRESS = "Rua das Acácias, 45 - Vila Aurora, SP"

function address(street: string, city: string): string {
  return `${street} - ${city}, SP`
}

function evidencePhoto(label: string): Attachment {
  return {
    id: generateId("anexo"),
    name: label,
    url: `/mock-attachments/${label}`,
    uploaded_at: new Date().toISOString(),
  }
}

interface RequestSpec {
  clientId: string
  materialId: string
  transportType: VehicleType
  originCity: string
  destinationCity: string
  status: RequestStatus
  daysAgoCreated: number
  driverId?: string
  vehicleId?: string
  scheduledInDays?: number
  freightOverride?: number
  paymentMethod?: PaymentMethod
  invoiceNumber?: string
  opNumber?: string
  requester: string
  requesterPhone: string
  cancelReason?: string
  cancelledFromStatus?: RequestStatus
  cancelledByStaff?: boolean
  pathOverride?: RequestStatus[]
  linkLocation?: boolean
  deliveredDaysAfterCreated?: number
  notes?: string
}

const specs: RequestSpec[] = [
  // --- agendada (futuro, invisível para motoristas) ---
  {
    clientId: SEED_CLIENT_IDS.serraDourada,
    materialId: SEED_MATERIAL_IDS.metais,
    transportType: "caminhao_medio",
    originCity: "Serra Dourada",
    destinationCity: "Vale Novo",
    status: "agendada",
    daysAgoCreated: 1,
    scheduledInDays: 2,
    requester: "Patrícia Nogueira",
    requesterPhone: "(11) 3544-7788",
  },
  {
    clientId: SEED_CLIENT_IDS.monteVerde,
    materialId: SEED_MATERIAL_IDS.farmaceuticos,
    transportType: "utilitario",
    originCity: "Monte Verde",
    destinationCity: "Rio Bonito",
    status: "agendada",
    daysAgoCreated: 1,
    scheduledInDays: 5,
    requester: "Eduardo Vasconcelos",
    requesterPhone: "(11) 3655-8899",
  },
  // --- agendada com data já passada: o agendador promove para "solicitada" ao carregar o app ---
  {
    clientId: SEED_CLIENT_IDS.mendes,
    materialId: SEED_MATERIAL_IDS.eletronicos,
    transportType: "utilitario",
    originCity: "Vale Novo",
    destinationCity: "Serra Dourada",
    status: "agendada",
    daysAgoCreated: 3,
    scheduledInDays: -1,
    requester: "Roberto Carlos Mendes",
    requesterPhone: "(11) 98766-9955",
    notes: "Coleta programada — aguardando o agendador promover automaticamente.",
  },
  // --- solicitada (pool visível para motoristas) ---
  {
    clientId: SEED_CLIENT_IDS.boaVista,
    materialId: SEED_MATERIAL_IDS.alimentos,
    transportType: "utilitario",
    originCity: "Boa Vista do Rio",
    destinationCity: "Porto Claro",
    status: "solicitada",
    daysAgoCreated: 1,
    requester: "Simone Cardoso",
    requesterPhone: "(11) 3433-6677",
    paymentMethod: "boleto",
  },
  {
    clientId: SEED_CLIENT_IDS.rioBonito,
    materialId: SEED_MATERIAL_IDS.autopecas,
    transportType: "caminhao_medio",
    originCity: "Rio Bonito",
    destinationCity: "Monte Verde",
    status: "solicitada",
    daysAgoCreated: 1,
    requester: "Marcelo Tadeu",
    requesterPhone: "(11) 3766-9900",
  },
  {
    clientId: SEED_CLIENT_IDS.construplus,
    materialId: SEED_MATERIAL_IDS.construcao,
    transportType: "caminhao_grande",
    originCity: "Porto Claro",
    destinationCity: "Boa Vista do Rio",
    status: "solicitada",
    daysAgoCreated: 2,
    requester: "Juliana Paes Barreto",
    requesterPhone: "(11) 98877-1122",
    invoiceNumber: "NF-2026-00871",
  },
  {
    clientId: SEED_CLIENT_IDS.mendes,
    materialId: SEED_MATERIAL_IDS.eletronicos,
    transportType: "moto",
    originCity: "Vale Novo",
    destinationCity: UNRESOLVED_ADDRESS,
    status: "solicitada",
    daysAgoCreated: 1,
    requester: "Roberto Carlos Mendes",
    requesterPhone: "(11) 98766-9955",
    notes: "Endereço de entrega novo, fora da área usual — preço a combinar com a central.",
  },
  // --- aceita ---
  {
    clientId: SEED_CLIENT_IDS.serraDourada,
    materialId: SEED_MATERIAL_IDS.metais,
    transportType: "utilitario",
    originCity: "Serra Dourada",
    destinationCity: "Campo Alegre",
    status: "aceita",
    daysAgoCreated: 2,
    driverId: SEED_DRIVER_IDS.joao,
    vehicleId: SEED_VEHICLE_IDS.utilitario1,
    requester: "Patrícia Nogueira",
    requesterPhone: "(11) 3544-7788",
  },
  {
    clientId: SEED_CLIENT_IDS.construplus,
    materialId: SEED_MATERIAL_IDS.construcao,
    transportType: "caminhao_medio",
    originCity: "Porto Claro",
    destinationCity: "Nova Esperança",
    status: "aceita",
    daysAgoCreated: 2,
    driverId: SEED_DRIVER_IDS.marcia,
    vehicleId: SEED_VEHICLE_IDS.caminhaoMedio1,
    requester: "Juliana Paes Barreto",
    requesterPhone: "(11) 98877-1122",
  },
  // --- pendente_coleta ---
  {
    clientId: SEED_CLIENT_IDS.boaVista,
    materialId: SEED_MATERIAL_IDS.alimentos,
    transportType: "caminhao_medio",
    originCity: "Boa Vista do Rio",
    destinationCity: "Nova Esperança",
    status: "pendente_coleta",
    daysAgoCreated: 3,
    driverId: SEED_DRIVER_IDS.marcia,
    vehicleId: SEED_VEHICLE_IDS.caminhaoMedio1,
    pathOverride: ["solicitada", "aceita", "pendente_coleta"],
    requester: "Simone Cardoso",
    requesterPhone: "(11) 3433-6677",
  },
  // --- coletada (com evidência fotográfica já anexada — regra 2) ---
  {
    clientId: SEED_CLIENT_IDS.monteVerde,
    materialId: SEED_MATERIAL_IDS.farmaceuticos,
    transportType: "utilitario",
    originCity: "Monte Verde",
    destinationCity: "Rio Bonito",
    status: "coletada",
    daysAgoCreated: 3,
    driverId: SEED_DRIVER_IDS.joao,
    vehicleId: SEED_VEHICLE_IDS.utilitario1,
    requester: "Eduardo Vasconcelos",
    requesterPhone: "(11) 3655-8899",
  },
  {
    clientId: SEED_CLIENT_IDS.rioBonito,
    materialId: SEED_MATERIAL_IDS.autopecas,
    transportType: "caminhao_medio",
    originCity: "Rio Bonito",
    destinationCity: "Vila das Flores",
    status: "coletada",
    daysAgoCreated: 4,
    driverId: SEED_DRIVER_IDS.marcia,
    vehicleId: SEED_VEHICLE_IDS.caminhaoMedio1,
    requester: "Marcelo Tadeu",
    requesterPhone: "(11) 3766-9900",
  },
  // --- em_rota ---
  {
    clientId: SEED_CLIENT_IDS.serraDourada,
    materialId: SEED_MATERIAL_IDS.metais,
    transportType: "utilitario",
    originCity: "Serra Dourada",
    destinationCity: "Vale Novo",
    status: "em_rota",
    daysAgoCreated: 2,
    driverId: SEED_DRIVER_IDS.joao,
    vehicleId: SEED_VEHICLE_IDS.utilitario1,
    linkLocation: true,
    requester: "Patrícia Nogueira",
    requesterPhone: "(11) 3544-7788",
    notes: "Cliente pediu para avisar 30 minutos antes da chegada.",
  },
  {
    clientId: SEED_CLIENT_IDS.monteVerde,
    materialId: SEED_MATERIAL_IDS.farmaceuticos,
    transportType: "caminhao_medio",
    originCity: "Monte Verde",
    destinationCity: "Vila das Flores",
    status: "em_rota",
    daysAgoCreated: 2,
    driverId: SEED_DRIVER_IDS.marcia,
    vehicleId: SEED_VEHICLE_IDS.caminhaoMedio1,
    requester: "Eduardo Vasconcelos",
    requesterPhone: "(11) 3655-8899",
  },
  // --- pendente_entrega ---
  {
    clientId: SEED_CLIENT_IDS.mendes,
    materialId: SEED_MATERIAL_IDS.eletronicos,
    transportType: "utilitario",
    originCity: "Vale Novo",
    destinationCity: "Serra Dourada",
    status: "pendente_entrega",
    daysAgoCreated: 3,
    driverId: SEED_DRIVER_IDS.joao,
    vehicleId: SEED_VEHICLE_IDS.utilitario1,
    pathOverride: ["solicitada", "aceita", "coletada", "em_rota", "pendente_entrega"],
    requester: "Roberto Carlos Mendes",
    requesterPhone: "(11) 98766-9955",
  },
  // --- entregue (11, espalhadas nos últimos ~60 dias) ---
  {
    clientId: SEED_CLIENT_IDS.mendes,
    materialId: SEED_MATERIAL_IDS.eletronicos,
    transportType: "utilitario",
    originCity: "Vale Novo",
    destinationCity: "Campo Alegre",
    status: "entregue",
    daysAgoCreated: 5,
    deliveredDaysAfterCreated: 1,
    driverId: SEED_DRIVER_IDS.joao,
    vehicleId: SEED_VEHICLE_IDS.utilitario1,
    requester: "Roberto Carlos Mendes",
    requesterPhone: "(11) 98766-9955",
    paymentMethod: "pix",
  },
  {
    clientId: SEED_CLIENT_IDS.construplus,
    materialId: SEED_MATERIAL_IDS.construcao,
    transportType: "caminhao_grande",
    originCity: "Porto Claro",
    destinationCity: "Nova Esperança",
    status: "entregue",
    daysAgoCreated: 9,
    deliveredDaysAfterCreated: 2,
    driverId: SEED_DRIVER_IDS.marcia,
    vehicleId: SEED_VEHICLE_IDS.caminhaoGrande1,
    requester: "Juliana Paes Barreto",
    requesterPhone: "(11) 98877-1122",
    paymentMethod: "boleto",
    invoiceNumber: "NF-2026-00654",
  },
  {
    clientId: SEED_CLIENT_IDS.boaVista,
    materialId: SEED_MATERIAL_IDS.alimentos,
    transportType: "utilitario",
    originCity: "Boa Vista do Rio",
    destinationCity: "Porto Claro",
    status: "entregue",
    daysAgoCreated: 14,
    deliveredDaysAfterCreated: 1,
    driverId: SEED_DRIVER_IDS.joao,
    vehicleId: SEED_VEHICLE_IDS.utilitario1,
    requester: "Simone Cardoso",
    requesterPhone: "(11) 3433-6677",
    paymentMethod: "cartao",
  },
  {
    clientId: SEED_CLIENT_IDS.serraDourada,
    materialId: SEED_MATERIAL_IDS.metais,
    transportType: "caminhao_medio",
    originCity: "Serra Dourada",
    destinationCity: "Vale Novo",
    status: "entregue",
    daysAgoCreated: 18,
    deliveredDaysAfterCreated: 2,
    driverId: SEED_DRIVER_IDS.marcia,
    vehicleId: SEED_VEHICLE_IDS.caminhaoMedio1,
    requester: "Patrícia Nogueira",
    requesterPhone: "(11) 3544-7788",
    paymentMethod: "boleto",
  },
  {
    clientId: SEED_CLIENT_IDS.monteVerde,
    materialId: SEED_MATERIAL_IDS.farmaceuticos,
    transportType: "utilitario",
    originCity: "Monte Verde",
    destinationCity: "Rio Bonito",
    status: "entregue",
    daysAgoCreated: 22,
    deliveredDaysAfterCreated: 1,
    driverId: SEED_DRIVER_IDS.joao,
    vehicleId: SEED_VEHICLE_IDS.utilitario1,
    requester: "Eduardo Vasconcelos",
    requesterPhone: "(11) 3655-8899",
    paymentMethod: "pix",
    freightOverride: 260,
    notes: "Valor negociado pontualmente com o cliente, abaixo da tabela padrão.",
  },
  {
    clientId: SEED_CLIENT_IDS.rioBonito,
    materialId: SEED_MATERIAL_IDS.autopecas,
    transportType: "caminhao_medio",
    originCity: "Rio Bonito",
    destinationCity: "Monte Verde",
    status: "entregue",
    daysAgoCreated: 27,
    deliveredDaysAfterCreated: 2,
    driverId: SEED_DRIVER_IDS.marcia,
    vehicleId: SEED_VEHICLE_IDS.caminhaoMedio1,
    requester: "Marcelo Tadeu",
    requesterPhone: "(11) 3766-9900",
    paymentMethod: "dinheiro",
  },
  {
    clientId: SEED_CLIENT_IDS.mendes,
    materialId: SEED_MATERIAL_IDS.eletronicos,
    transportType: "moto",
    originCity: "Vale Novo",
    destinationCity: "Serra Dourada",
    status: "entregue",
    daysAgoCreated: 33,
    deliveredDaysAfterCreated: 1,
    driverId: SEED_DRIVER_IDS.joao,
    vehicleId: SEED_VEHICLE_IDS.moto1,
    requester: "Roberto Carlos Mendes",
    requesterPhone: "(11) 98766-9955",
    paymentMethod: "pix",
  },
  {
    clientId: SEED_CLIENT_IDS.construplus,
    materialId: SEED_MATERIAL_IDS.construcao,
    transportType: "caminhao_grande",
    originCity: "Porto Claro",
    destinationCity: "Boa Vista do Rio",
    status: "entregue",
    daysAgoCreated: 40,
    deliveredDaysAfterCreated: 2,
    driverId: SEED_DRIVER_IDS.marcia,
    vehicleId: SEED_VEHICLE_IDS.caminhaoGrande1,
    requester: "Juliana Paes Barreto",
    requesterPhone: "(11) 98877-1122",
    paymentMethod: "boleto",
  },
  {
    clientId: SEED_CLIENT_IDS.serraDourada,
    materialId: SEED_MATERIAL_IDS.metais,
    transportType: "caminhao_grande",
    originCity: "Serra Dourada",
    destinationCity: "Campo Alegre",
    status: "entregue",
    daysAgoCreated: 47,
    deliveredDaysAfterCreated: 3,
    driverId: SEED_DRIVER_IDS.marcia,
    vehicleId: SEED_VEHICLE_IDS.caminhaoGrande2,
    requester: "Patrícia Nogueira",
    requesterPhone: "(11) 3544-7788",
    paymentMethod: "cartao",
  },
  {
    clientId: SEED_CLIENT_IDS.boaVista,
    materialId: SEED_MATERIAL_IDS.alimentos,
    transportType: "utilitario",
    originCity: "Boa Vista do Rio",
    destinationCity: "Nova Esperança",
    status: "entregue",
    daysAgoCreated: 53,
    deliveredDaysAfterCreated: 1,
    driverId: SEED_DRIVER_IDS.joao,
    vehicleId: SEED_VEHICLE_IDS.utilitario2,
    requester: "Simone Cardoso",
    requesterPhone: "(11) 3433-6677",
    paymentMethod: "pix",
  },
  {
    clientId: SEED_CLIENT_IDS.monteVerde,
    materialId: SEED_MATERIAL_IDS.farmaceuticos,
    transportType: "caminhao_medio",
    originCity: "Monte Verde",
    destinationCity: "Rio Bonito",
    status: "entregue",
    daysAgoCreated: 59,
    deliveredDaysAfterCreated: 2,
    driverId: SEED_DRIVER_IDS.marcia,
    vehicleId: SEED_VEHICLE_IDS.caminhaoMedio1,
    requester: "Eduardo Vasconcelos",
    requesterPhone: "(11) 3655-8899",
    paymentMethod: "boleto",
  },
  // --- cancelada ---
  {
    clientId: SEED_CLIENT_IDS.rioBonito,
    materialId: SEED_MATERIAL_IDS.autopecas,
    transportType: "utilitario",
    originCity: "Rio Bonito",
    destinationCity: "Monte Verde",
    status: "cancelada",
    daysAgoCreated: 6,
    cancelledFromStatus: "solicitada",
    cancelReason: "Cliente desistiu do frete após reavaliar o orçamento.",
    requester: "Marcelo Tadeu",
    requesterPhone: "(11) 3766-9900",
  },
  {
    clientId: SEED_CLIENT_IDS.construplus,
    materialId: SEED_MATERIAL_IDS.construcao,
    transportType: "caminhao_medio",
    originCity: "Porto Claro",
    destinationCity: "Boa Vista do Rio",
    status: "cancelada",
    daysAgoCreated: 8,
    cancelledFromStatus: "aceita",
    cancelledByStaff: true,
    cancelReason: "Endereço de coleta informado incorretamente pelo cliente; nova solicitação será criada.",
    requester: "Juliana Paes Barreto",
    requesterPhone: "(11) 98877-1122",
  },
]

function buildHistoryPath(spec: RequestSpec): RequestStatus[] {
  if (spec.pathOverride) return spec.pathOverride
  if (spec.status === "agendada") return ["agendada"]
  if (spec.status === "cancelada" && spec.cancelledFromStatus) {
    const idx = DRIVER_FORWARD_SEQUENCE.indexOf(spec.cancelledFromStatus)
    return DRIVER_FORWARD_SEQUENCE.slice(0, idx + 1)
  }
  const idx = DRIVER_FORWARD_SEQUENCE.indexOf(spec.status)
  return DRIVER_FORWARD_SEQUENCE.slice(0, idx + 1)
}

export function seedSolicitacoes(): {
  solicitacoes: Solicitacao[]
  historico: HistoricoStatusSolicitacao[]
  nextRequestNumber: number
} {
  const solicitacoes: Solicitacao[] = []
  const historico: HistoricoStatusSolicitacao[] = []
  let requestNumber = 1000

  specs.forEach((spec, index) => {
    const id = `solicitacao-${index + 1}`
    const createdAt = atOffset(-spec.daysAgoCreated)
    const originAddress = address("Av. Principal, 100", spec.originCity)
    const destinationAddress =
      spec.destinationCity === UNRESOLVED_ADDRESS
        ? UNRESOLVED_ADDRESS
        : address("Rua Secundária, 200", spec.destinationCity)
    const region = resolvePricingRegion(originAddress, destinationAddress)

    const deliveredAt =
      spec.status === "entregue" && spec.deliveredDaysAfterCreated != null
        ? atOffset(-spec.daysAgoCreated + spec.deliveredDaysAfterCreated)
        : undefined

    const isCancelled = spec.status === "cancelada"
    const endAt = deliveredAt ?? (isCancelled ? atOffset(-spec.daysAgoCreated + 1) : new Date())

    const path = buildHistoryPath(spec)
    const attachments: Attachment[] = path.includes("coletada")
      ? [evidencePhoto(`evidencia-coleta-${index + 1}.jpg`)]
      : []

    const solicitacao: Solicitacao = {
      id,
      request_number: requestNumber++,
      client_id: spec.clientId,
      driver_id: spec.driverId,
      vehicle_id: spec.vehicleId,
      material_type_id: spec.materialId,
      origin_address: originAddress,
      origin_company: undefined,
      destination_address: destinationAddress,
      destination_company: undefined,
      region,
      transport_type: spec.transportType,
      status: spec.status,
      scheduled_date:
        spec.scheduledInDays != null ? atOffset(spec.scheduledInDays).toISOString() : undefined,
      delivered_at: deliveredAt?.toISOString(),
      notes: isCancelled ? spec.cancelReason : spec.notes,
      requester: spec.requester,
      requester_phone: spec.requesterPhone,
      invoice_number: spec.invoiceNumber,
      op_number: spec.opNumber,
      payment_method: spec.paymentMethod,
      freight_override: spec.freightOverride,
      attachments,
      version: 1,
      created_at: createdAt.toISOString(),
      updated_at: endAt.toISOString(),
    }
    solicitacoes.push(solicitacao)

    // --- monta o histórico de status, distribuindo timestamps entre criação e o fim ---
    const totalSteps = isCancelled ? path.length + 1 : path.length
    const span = endAt.getTime() - createdAt.getTime()

    path.forEach((status, stepIndex) => {
      const timestamp = new Date(
        createdAt.getTime() + (span * stepIndex) / Math.max(totalSteps - 1, 1),
      )
      const isCreationStep = stepIndex === 0
      const driverUserId = spec.driverId ? DRIVER_USER_BY_DRIVER_ID[spec.driverId] : undefined
      const changedBy = isCreationStep
        ? (CLIENT_USER_LINKS[spec.clientId] ?? SEED_USER_IDS.assistente)
        : (driverUserId ?? SEED_USER_IDS.gestor)

      historico.push({
        id: `${id}-hist-${stepIndex}`,
        delivery_request_id: id,
        status,
        changed_by: changedBy,
        changed_by_name: ACTOR_NAMES[changedBy] ?? "Sistema",
        changed_at: timestamp.toISOString(),
        attachments: status === "coletada" ? attachments : [],
      })
    })

    if (isCancelled) {
      const cancelledBy = spec.cancelledByStaff
        ? SEED_USER_IDS.gestor
        : (CLIENT_USER_LINKS[spec.clientId] ?? SEED_USER_IDS.assistente)
      historico.push({
        id: `${id}-hist-cancel`,
        delivery_request_id: id,
        status: "cancelada",
        changed_by: cancelledBy,
        changed_by_name: ACTOR_NAMES[cancelledBy] ?? "Sistema",
        changed_at: endAt.toISOString(),
        notes: spec.cancelReason,
        attachments: [],
      })
    }
  })

  return { solicitacoes, historico, nextRequestNumber: requestNumber }
}

export const SEED_LINKED_LOCATION_REQUEST_ID = (() => {
  const index = specs.findIndex((s) => s.linkLocation)
  return index === -1 ? undefined : `solicitacao-${index + 1}`
})()
