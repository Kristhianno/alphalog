import type { Attachment, Solicitacao, HistoricoStatusSolicitacao } from "@/types/entities"
import type { RequestStatus, VehicleType } from "@/types/enums"
import { getDB, saveDB, consumeNextRequestNumber, peekNextRequestNumber } from "../db/store"
import { generateId, nowIso } from "../db/ids"
import { simulateLatency } from "./shared/latency"
import { ApiError } from "./shared/errors"
import { isStaff, type Actor } from "./shared/actor"
import { runScheduler } from "../scheduler"
import {
  canTransition,
  isClientEditableStatus,
  requiresAttachmentForTransition,
} from "@/domain/requestStatus"
import { resolvePricingRegion } from "@/domain/regions"

export { peekNextRequestNumber }

function appendHistory(
  requestId: string,
  status: RequestStatus,
  actor: Actor,
  actorName: string,
  options?: { notes?: string; attachments?: Attachment[] },
): void {
  const db = getDB()
  const entry: HistoricoStatusSolicitacao = {
    id: generateId("hist"),
    delivery_request_id: requestId,
    status,
    changed_by: actor.userId,
    changed_by_name: actorName,
    changed_at: nowIso(),
    notes: options?.notes,
    attachments: options?.attachments ?? [],
  }
  db.historicoStatus.push(entry)
}

function findRequestOrThrow(id: string): Solicitacao {
  const db = getDB()
  const request = db.solicitacoes.find((r) => r.id === id)
  if (!request) throw new ApiError("NOT_FOUND", "Solicitação não encontrada.")
  return request
}

export async function listSolicitacoes(actor: Actor): Promise<Solicitacao[]> {
  await simulateLatency()
  runScheduler()
  const db = getDB()

  let visible: Solicitacao[]

  if (isStaff(actor)) {
    visible = db.solicitacoes
  } else if (actor.role === "motorista") {
    const driver = db.motoristas.find((m) => m.id === actor.driverId)
    const enabledTypes = new Set(driver?.enabled_vehicle_types ?? [])
    visible = db.solicitacoes.filter(
      (r) =>
        r.driver_id === actor.driverId ||
        (r.status === "solicitada" && !r.driver_id && enabledTypes.has(r.transport_type)),
    )
  } else {
    visible = db.solicitacoes.filter((r) => r.client_id === actor.clientId)
  }

  return [...visible].sort((a, b) => b.request_number - a.request_number)
}

export async function getSolicitacao(id: string, actor: Actor): Promise<Solicitacao> {
  await simulateLatency()
  const request = findRequestOrThrow(id)

  if (!isStaff(actor)) {
    if (actor.role === "cliente" && request.client_id !== actor.clientId) {
      throw new ApiError("FORBIDDEN", "Você não tem acesso a esta solicitação.")
    }
    if (actor.role === "motorista" && request.driver_id !== actor.driverId && request.status !== "solicitada") {
      throw new ApiError("FORBIDDEN", "Você não tem acesso a esta solicitação.")
    }
  }

  return request
}

export async function getHistorico(requestId: string): Promise<HistoricoStatusSolicitacao[]> {
  await simulateLatency()
  const db = getDB()
  return db.historicoStatus
    .filter((h) => h.delivery_request_id === requestId)
    .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime())
}

export interface CreateSolicitacaoInput {
  clientId: string
  materialTypeId: string
  transportType: VehicleType
  originAddress: string
  originCompany?: string
  destinationAddress: string
  destinationCompany?: string
  requester: string
  requesterPhone: string
  invoiceNumber?: string
  opNumber?: string
  notes?: string
  scheduledDate?: string
  attachments?: Attachment[]
}

export async function createSolicitacao(
  input: CreateSolicitacaoInput,
  actor: Actor,
  actorName: string,
): Promise<Solicitacao> {
  await simulateLatency()
  const db = getDB()

  const isScheduledForFuture =
    !!input.scheduledDate && new Date(input.scheduledDate).getTime() > Date.now()
  const status: RequestStatus = isScheduledForFuture ? "agendada" : "solicitada"
  const region = resolvePricingRegion(input.originAddress, input.destinationAddress)
  const timestamp = nowIso()

  const request: Solicitacao = {
    id: generateId("solicitacao"),
    request_number: consumeNextRequestNumber(),
    client_id: input.clientId,
    material_type_id: input.materialTypeId,
    origin_address: input.originAddress,
    origin_company: input.originCompany,
    destination_address: input.destinationAddress,
    destination_company: input.destinationCompany,
    region,
    transport_type: input.transportType,
    status,
    scheduled_date: input.scheduledDate,
    requester: input.requester,
    requester_phone: input.requesterPhone,
    invoice_number: input.invoiceNumber,
    op_number: input.opNumber,
    notes: input.notes,
    attachments: input.attachments ?? [],
    version: 1,
    created_at: timestamp,
    updated_at: timestamp,
  }

  db.solicitacoes.push(request)
  appendHistory(request.id, status, actor, actorName)
  saveDB()

  return request
}

const STAFF_EDITABLE_FIELDS = [
  "driver_id",
  "vehicle_id",
  "freight_override",
  "payment_method",
  "notes",
  "invoice_number",
  "op_number",
  "requester",
  "requester_phone",
  "material_type_id",
  "origin_address",
  "destination_address",
  "origin_company",
  "destination_company",
  "transport_type",
  "scheduled_date",
  "attachments",
] as const

const CLIENT_EDITABLE_FIELDS = [
  "origin_address",
  "destination_address",
  "origin_company",
  "destination_company",
  "material_type_id",
  "transport_type",
  "notes",
  "requester",
  "requester_phone",
  "invoice_number",
  "op_number",
  "attachments",
] as const

export type SolicitacaoPatch = Partial<
  Pick<
    Solicitacao,
    | "driver_id"
    | "vehicle_id"
    | "freight_override"
    | "payment_method"
    | "notes"
    | "invoice_number"
    | "op_number"
    | "requester"
    | "requester_phone"
    | "material_type_id"
    | "origin_address"
    | "destination_address"
    | "origin_company"
    | "destination_company"
    | "transport_type"
    | "scheduled_date"
    | "attachments"
  >
>

export async function updateSolicitacao(
  id: string,
  patch: SolicitacaoPatch,
  actor: Actor,
): Promise<Solicitacao> {
  await simulateLatency()
  const request = findRequestOrThrow(id)

  const allowedFields: readonly string[] = isStaff(actor)
    ? STAFF_EDITABLE_FIELDS
    : CLIENT_EDITABLE_FIELDS

  if (!isStaff(actor)) {
    if (actor.role !== "cliente" || request.client_id !== actor.clientId) {
      throw new ApiError("FORBIDDEN", "Você não tem permissão para editar esta solicitação.")
    }
    if (!isClientEditableStatus(request.status)) {
      throw new ApiError(
        "FORBIDDEN",
        "Só é possível editar a solicitação enquanto ela ainda não foi aceita por um motorista.",
      )
    }
  }

  const disallowed = Object.keys(patch).filter((key) => !allowedFields.includes(key))
  if (disallowed.length > 0) {
    throw new ApiError("FORBIDDEN", `Campos não editáveis para este papel: ${disallowed.join(", ")}`)
  }

  Object.assign(request, patch)

  if (patch.origin_address || patch.destination_address) {
    request.region = resolvePricingRegion(request.origin_address, request.destination_address)
  }

  request.updated_at = nowIso()
  saveDB()
  return request
}

export async function changeSolicitacaoStatus(
  id: string,
  target: RequestStatus,
  actor: Actor,
  actorName: string,
  options?: { notes?: string; attachments?: Attachment[] },
): Promise<Solicitacao> {
  await simulateLatency()
  const request = findRequestOrThrow(id)

  if (actor.role === "motorista" && request.driver_id !== actor.driverId) {
    throw new ApiError("FORBIDDEN", "Esta entrega não está atribuída a você.")
  }

  const check = canTransition(actor.role, request.status, target)
  if (!check.allowed) {
    throw new ApiError("VALIDATION", check.reason ?? "Transição de status não permitida.")
  }

  if (requiresAttachmentForTransition(target) && !(options?.attachments?.length)) {
    throw new ApiError(
      "VALIDATION",
      "Anexe ao menos uma foto de evidência antes de confirmar a coleta.",
    )
  }

  request.status = target
  request.version += 1
  request.updated_at = nowIso()
  if (target === "entregue") request.delivered_at = nowIso()
  if (options?.attachments?.length) {
    request.attachments = [...request.attachments, ...options.attachments]
  }

  appendHistory(request.id, target, actor, actorName, options)
  saveDB()
  return request
}

/**
 * Aceite de corrida pelo motorista, com checagem de concorrência otimista (regra 3):
 * só é aplicado se a solicitação ainda estiver "solicitada" e sem motorista no momento
 * exato da gravação — não apenas na leitura da tela.
 */
export async function acceptSolicitacao(
  id: string,
  actor: Actor,
  actorName: string,
): Promise<Solicitacao> {
  await simulateLatency()
  if (actor.role !== "motorista" || !actor.driverId) {
    throw new ApiError("FORBIDDEN", "Apenas motoristas podem aceitar corridas.")
  }

  const db = getDB()
  const request = findRequestOrThrow(id)

  if (request.status !== "solicitada" || request.driver_id) {
    throw new ApiError("CONFLICT", "Esta corrida já foi aceita por outro motorista.")
  }

  const driver = db.motoristas.find((m) => m.id === actor.driverId)
  if (!driver || !driver.enabled_vehicle_types.includes(request.transport_type)) {
    throw new ApiError(
      "FORBIDDEN",
      "Seu cadastro não está habilitado para o tipo de veículo desta corrida.",
    )
  }

  request.driver_id = driver.id
  request.vehicle_id = driver.vehicle_id
  request.status = "aceita"
  request.version += 1
  request.updated_at = nowIso()

  appendHistory(request.id, "aceita", actor, actorName)
  saveDB()
  return request
}

export async function cancelSolicitacao(
  id: string,
  reason: string,
  actor: Actor,
  actorName: string,
): Promise<Solicitacao> {
  await simulateLatency()
  if (!reason.trim()) {
    throw new ApiError("VALIDATION", "Informe o motivo do cancelamento.")
  }

  const request = findRequestOrThrow(id)

  if (request.status === "entregue" || request.status === "cancelada") {
    throw new ApiError("VALIDATION", "Esta solicitação não pode mais ser cancelada.")
  }

  if (actor.role === "cliente") {
    if (request.client_id !== actor.clientId) {
      throw new ApiError("FORBIDDEN", "Você não tem acesso a esta solicitação.")
    }
    if (!isClientEditableStatus(request.status)) {
      throw new ApiError(
        "FORBIDDEN",
        "Só é possível cancelar enquanto a solicitação ainda não foi aceita por um motorista.",
      )
    }
  } else if (actor.role === "motorista" && request.driver_id !== actor.driverId) {
    throw new ApiError("FORBIDDEN", "Esta entrega não está atribuída a você.")
  }

  request.status = "cancelada"
  request.notes = reason
  request.version += 1
  request.updated_at = nowIso()

  appendHistory(request.id, "cancelada", actor, actorName, { notes: reason })
  saveDB()
  return request
}

export async function deleteSolicitacao(
  id: string,
  reason: string,
  actor: Actor,
): Promise<void> {
  await simulateLatency()
  if (!isStaff(actor)) {
    throw new ApiError("FORBIDDEN", "Apenas a administração pode excluir solicitações.")
  }
  if (!reason.trim()) {
    throw new ApiError("VALIDATION", "Informe o motivo da exclusão.")
  }

  const db = getDB()
  const request = findRequestOrThrow(id)

  db.solicitacoes = db.solicitacoes.filter((r) => r.id !== request.id)
  db.historicoStatus = db.historicoStatus.filter((h) => h.delivery_request_id !== request.id)
  saveDB()
}
