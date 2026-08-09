import type { FuelType, MaintenanceType, PaymentMethod, RequestStatus, Role, VehicleType } from "@/types/enums"

export const APP_NAME = "AlphaLog"
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

/** Classes de cor do avatar (fundo/texto) por papel, para diferenciação visual rápida nas listas. */
export const ROLE_AVATAR_CLASSES: Record<Role, string> = {
  admin: "bg-primary/15 text-primary",
  gestor: "bg-accent text-accent-foreground",
  assistente_logistico: "bg-success/15 text-success",
  motorista: "bg-warning/20 text-warning-foreground",
  cliente: "bg-muted text-muted-foreground",
}

/**
 * Especificações de referência por tipo de veículo (dimensões em metros, capacidade em kg),
 * usadas no popover de ajuda ao selecionar tipos habilitados de um motorista (doc/04, seção 6).
 * Valores de referência do tipo, não de uma unidade específica da frota (doc/08).
 */
export const VEHICLE_TYPE_SPECS: Record<
  VehicleType,
  { capacity: number; length: number; width: number; height: number; description: string }
> = {
  moto: {
    capacity: 50,
    length: 0.6,
    width: 0.4,
    height: 0.4,
    description: "Entregas rápidas e de pequeno volume, sem exigência de baú.",
  },
  utilitario: {
    capacity: 800,
    length: 2.5,
    width: 1.6,
    height: 1.6,
    description: "Cargas fracionadas de pequeno/médio porte, uso urbano.",
  },
  caminhao_medio: {
    capacity: 4000,
    length: 6,
    width: 2.2,
    height: 2.2,
    description: "Cargas de médio porte, rotas urbanas e regionais.",
  },
  caminhao_grande: {
    capacity: 12000,
    length: 9,
    width: 2.5,
    height: 2.7,
    description: "Cargas de grande porte, rotas regionais e interestaduais.",
  },
}
