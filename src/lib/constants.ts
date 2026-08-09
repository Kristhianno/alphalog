import type { FuelType, MaintenanceType, PaymentMethod, RequestStatus, Role, VehicleType } from "@/types/enums"

export const APP_NAME = "AlphaData"
export const SYNTHETIC_EMAIL_DOMAIN = "alphadata.internal"

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  assistente_logistico: "Assistente Logístico",
  motorista: "Motorista",
  cliente: "Cliente",
}

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  moto: "Moto",
  utilitario: "Utilitário",
  caminhao_medio: "Caminhão médio",
  caminhao_grande: "Caminhão grande",
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  cartao: "Cartão",
  boleto: "Boleto",
  dinheiro: "Dinheiro",
}

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  gasolina: "Gasolina",
  alcool: "Álcool",
  diesel: "Diesel",
  gnv: "GNV",
}

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  preventiva: "Preventiva",
  corretiva: "Corretiva",
  preditiva: "Preditiva",
}

/** Cor de badge (variant do componente Badge) por status da solicitação. */
export const STATUS_BADGE_VARIANT: Record<
  RequestStatus,
  "default" | "secondary" | "outline" | "destructive" | "success" | "warning" | "muted"
> = {
  agendada: "muted",
  solicitada: "warning",
  aceita: "default",
  pendente_coleta: "default",
  coletada: "default",
  em_rota: "default",
  pendente_entrega: "default",
  entregue: "success",
  cancelada: "destructive",
}
