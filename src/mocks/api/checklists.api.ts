import type { Attachment, ChecklistItemResposta, ChecklistVeiculo } from "@/types/entities"
import { getDB, saveDB } from "../db/store"
import { generateId, nowIso } from "../db/ids"
import { simulateLatency } from "./shared/latency"
import { ApiError } from "./shared/errors"
import { assertOwnerOrStaff, visibleToActor } from "./shared/ownership"
import type { Actor } from "./shared/actor"

export async function listChecklists(actor: Actor): Promise<ChecklistVeiculo[]> {
  await simulateLatency()
  return visibleToActor(getDB().checklists, actor)
}

export interface CreateChecklistInput {
  vehicleId: string
  vehiclePlate: string
  checklistDate: string
  currentKm: number
  materiais: ChecklistItemResposta[]
  materiaisObservacoes?: string
  materiaisAttachments?: Attachment[]
  veiculo: ChecklistItemResposta[]
  veiculoObservacoes?: string
  veiculoAttachments?: Attachment[]
}

export async function createChecklist(
  input: CreateChecklistInput,
  actor: Actor,
): Promise<ChecklistVeiculo> {
  await simulateLatency()
  if (actor.role !== "motorista" || !actor.driverId) {
    throw new ApiError("FORBIDDEN", "Apenas motoristas registram o próprio checklist.")
  }

  const db = getDB()
  const timestamp = nowIso()
  const record: ChecklistVeiculo = {
    id: generateId("checklist"),
    vehicle_id: input.vehicleId,
    driver_id: actor.driverId,
    vehicle_plate: input.vehiclePlate,
    checklist_date: input.checklistDate,
    current_km: input.currentKm,
    materiais: input.materiais,
    materiais_observacoes: input.materiaisObservacoes,
    materiais_attachments: input.materiaisAttachments ?? [],
    veiculo: input.veiculo,
    veiculo_observacoes: input.veiculoObservacoes,
    veiculo_attachments: input.veiculoAttachments ?? [],
    created_at: timestamp,
    updated_at: timestamp,
  }
  db.checklists.push(record)
  saveDB()
  return record
}

export async function updateChecklist(
  id: string,
  patch: Partial<CreateChecklistInput>,
  actor: Actor,
): Promise<ChecklistVeiculo> {
  await simulateLatency()
  const db = getDB()
  const record = db.checklists.find((r) => r.id === id)
  if (!record) throw new ApiError("NOT_FOUND", "Checklist não encontrado.")
  assertOwnerOrStaff(record.driver_id, actor)

  if (patch.currentKm != null) record.current_km = patch.currentKm
  if (patch.materiais) record.materiais = patch.materiais
  if (patch.materiaisObservacoes !== undefined) record.materiais_observacoes = patch.materiaisObservacoes
  if (patch.materiaisAttachments) record.materiais_attachments = patch.materiaisAttachments
  if (patch.veiculo) record.veiculo = patch.veiculo
  if (patch.veiculoObservacoes !== undefined) record.veiculo_observacoes = patch.veiculoObservacoes
  if (patch.veiculoAttachments) record.veiculo_attachments = patch.veiculoAttachments
  record.updated_at = nowIso()

  saveDB()
  return record
}

export async function deleteChecklist(id: string, actor: Actor): Promise<void> {
  await simulateLatency()
  const db = getDB()
  const record = db.checklists.find((r) => r.id === id)
  if (!record) throw new ApiError("NOT_FOUND", "Checklist não encontrado.")
  assertOwnerOrStaff(record.driver_id, actor)

  db.checklists = db.checklists.filter((r) => r.id !== id)
  saveDB()
}
