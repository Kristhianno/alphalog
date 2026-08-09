import type {
  ChecklistAnswer,
  FuelType,
  MaintenanceType,
  PaymentMethod,
  Role,
  RequestStatus,
  VehicleStatus,
  VehicleType,
} from "./enums"

interface Timestamped {
  created_at: string
  updated_at: string
}

/** Metadados de um anexo simulado (sem armazenamento binário durável — ver plano). */
export interface Attachment {
  id: string
  name: string
  /** Object URL de sessão quando o anexo foi enviado nesta sessão; caso contrário, um caminho fictício. */
  url: string
  uploaded_at: string
}

export interface Usuario extends Timestamped {
  id: string
  auth_id: string
  name: string
  /** e-mail real (autocadastro) ou sintético `{usuario}@alphadata.internal` (login por usuário) */
  email: string
  /** nome de usuário usado no login por usuário (contas criadas pela administração) */
  username?: string
  phone?: string
  avatar_url?: string
  password: string
}

export interface PapelDeUsuario {
  id: string
  user_id: string
  role: Role
  created_at: string
}

export interface Cliente extends Timestamped {
  id: string
  name: string
  email: string
  phone: string
  document: string
  address: string
  city: string
  state: string
  zip_code: string
  region: string
  notes?: string
  /** vínculo por e-mail com uma conta de login, quando o cliente também tem acesso ao portal */
  linked_user_email?: string
}

export interface PrecoDeFrete {
  id: string
  client_id: string
  transport_type: VehicleType
  region: string
  price: number
  created_at: string
}

export interface Veiculo extends Timestamped {
  id: string
  plate: string
  type: VehicleType
  brand: string
  model: string
  year: number
  capacity: number
  length: number
  width: number
  height: number
  document_number: string
  document_attachment?: Attachment
  status: VehicleStatus
}

export interface Motorista extends Timestamped {
  id: string
  user_id?: string
  name: string
  phone: string
  email: string
  license_number: string
  cnh_category: string
  cnh_valid_until: string
  cnh_attachment?: Attachment
  is_fixed: boolean
  vehicle_id?: string
  enabled_vehicle_types: VehicleType[]
  status: string
}

export interface TipoDeMaterial {
  id: string
  name: string
  description: string
  requires_special_handling: boolean
  created_at: string
}

export interface Solicitacao extends Timestamped {
  id: string
  request_number: number
  client_id: string
  driver_id?: string
  vehicle_id?: string
  material_type_id: string
  origin_address: string
  origin_company?: string
  destination_address: string
  destination_company?: string
  region?: string
  transport_type: VehicleType
  status: RequestStatus
  scheduled_date?: string
  delivered_at?: string
  notes?: string
  requester: string
  requester_phone: string
  invoice_number?: string
  op_number?: string
  payment_method?: PaymentMethod
  freight_override?: number
  attachments: Attachment[]
  /** usado internamente para a checagem de concorrência otimista no aceite (regra 3) */
  version: number
}

export interface HistoricoStatusSolicitacao {
  id: string
  delivery_request_id: string
  status: RequestStatus
  changed_by: string
  changed_by_name: string
  changed_at: string
  notes?: string
  attachments: Attachment[]
}

export interface LocalizacaoMotorista {
  id: string
  driver_id: string
  delivery_request_id?: string
  latitude: number
  longitude: number
  heading?: number
  speed?: number
  updated_at: string
}

export interface LogCombustivel extends Timestamped {
  id: string
  vehicle_id: string
  driver_id: string
  vehicle_plate: string
  log_date: string
  km_initial: number
  km_final: number
  liters: number
  fuel_price: number
  fuel_type: FuelType
  notes?: string
  attachments: Attachment[]
}

export interface TrocaDeOleo {
  id: string
  vehicle_id: string
  driver_id: string
  vehicle_plate: string
  change_date: string
  km_at_change: number
  next_change_km: number
  oil_type: string
  service_cost: number
  notes?: string
  attachments: Attachment[]
  created_at: string
}

export interface RegistroManutencao extends Timestamped {
  id: string
  vehicle_id: string
  driver_id: string
  vehicle_plate: string
  maintenance_type: MaintenanceType
  current_km: number
  service_cost: number
  notes?: string
  maintenance_date: string
  attachments: Attachment[]
}

export interface ChecklistItemResposta {
  id: string
  label: string
  status: ChecklistAnswer
  note?: string
}

export interface ChecklistVeiculo extends Timestamped {
  id: string
  vehicle_id: string
  driver_id: string
  vehicle_plate: string
  checklist_date: string
  current_km: number
  materiais: ChecklistItemResposta[]
  materiais_observacoes?: string
  materiais_attachments: Attachment[]
  veiculo: ChecklistItemResposta[]
  veiculo_observacoes?: string
  veiculo_attachments: Attachment[]
}

export interface PausaAlmoco extends Timestamped {
  id: string
  driver_id: string
  employee_name: string
  break_date: string
  exit_time: string
  return_time?: string
  observacoes?: string
  attachments: Attachment[]
  valor?: number
}

export interface RegiaoCidade {
  region: string
  cities: string[]
}
