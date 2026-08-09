export const ROLES = [
  "admin",
  "gestor",
  "assistente_logistico",
  "motorista",
  "cliente",
] as const
export type Role = (typeof ROLES)[number]

export const STAFF_ROLES: Role[] = ["admin", "gestor", "assistente_logistico"]

export const REQUEST_STATUSES = [
  "agendada",
  "solicitada",
  "aceita",
  "pendente_coleta",
  "coletada",
  "em_rota",
  "pendente_entrega",
  "entregue",
  "cancelada",
] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]

/** Ordem de progressão "para frente" que um motorista pode seguir (regra 1). */
export const DRIVER_FORWARD_SEQUENCE: RequestStatus[] = [
  "solicitada",
  "aceita",
  "pendente_coleta",
  "coletada",
  "em_rota",
  "pendente_entrega",
  "entregue",
]

export const ACTIVE_REQUEST_STATUSES: RequestStatus[] = [
  "aceita",
  "pendente_coleta",
  "coletada",
  "em_rota",
  "pendente_entrega",
]

export const PAYMENT_METHODS = ["pix", "cartao", "boleto", "dinheiro"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const FUEL_TYPES = ["gasolina", "alcool", "diesel", "gnv"] as const
export type FuelType = (typeof FUEL_TYPES)[number]

export const MAINTENANCE_TYPES = ["preventiva", "corretiva", "preditiva"] as const
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number]

export const VEHICLE_STATUSES = ["active", "maintenance", "inactive"] as const
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number]

export const CHECKLIST_ANSWERS = ["sim", "nao", ""] as const
export type ChecklistAnswer = (typeof CHECKLIST_ANSWERS)[number]

export const VEHICLE_TYPES = [
  "moto",
  "utilitario",
  "caminhao_medio",
  "caminhao_grande",
] as const
export type VehicleType = (typeof VEHICLE_TYPES)[number]
