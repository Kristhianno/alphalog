import type { Attachment, TrocaDeOleo } from "@/types/entities"
import { getDB, saveDB } from "../db/store"
import { generateId, nowIso } from "../db/ids"
import { simulateLatency } from "./shared/latency"
import { ApiError } from "./shared/errors"
import { assertOwnerOrStaff, visibleToActor } from "./shared/ownership"
import type { Actor } from "./shared/actor"

export async function listTrocasDeOleo(actor: Actor): Promise<TrocaDeOleo[]> {
  await simulateLatency()
  return visibleToActor(getDB().oleo, actor)
}

export interface CreateOilChangeInput {
  vehicleId: string
  vehiclePlate: string
  changeDate: string
  kmAtChange: number
  nextChangeKm: number
  oilType: string
  serviceCost: number
  notes?: string
  attachments?: Attachment[]
}

export async function createTrocaDeOleo(
  input: CreateOilChangeInput,
  actor: Actor,
): Promise<TrocaDeOleo> {
  await simulateLatency()
  if (actor.role !== "motorista" || !actor.driverId) {
    throw new ApiError("FORBIDDEN", "Apenas motoristas registram a própria troca de óleo.")
  }
  if (input.nextChangeKm <= input.kmAtChange) {
    throw new ApiError(
      "VALIDATION",
      "O KM da próxima troca deve ser maior que o KM da troca atual.",
    )
  }

  const db = getDB()
  const record: TrocaDeOleo = {
    id: generateId("oleo"),
    vehicle_id: input.vehicleId,
    driver_id: actor.driverId,
    vehicle_plate: input.vehiclePlate,
    change_date: input.changeDate,
    km_at_change: input.kmAtChange,
    next_change_km: input.nextChangeKm,
    oil_type: input.oilType,
    service_cost: input.serviceCost,
    notes: input.notes,
    attachments: input.attachments ?? [],
    created_at: nowIso(),
  }
  db.oleo.push(record)
  saveDB()
  return record
}

export async function updateTrocaDeOleo(
  id: string,
  patch: Partial<CreateOilChangeInput>,
  actor: Actor,
): Promise<TrocaDeOleo> {
  await simulateLatency()
  const db = getDB()
  const record = db.oleo.find((r) => r.id === id)
  if (!record) throw new ApiError("NOT_FOUND", "Registro não encontrado.")
  assertOwnerOrStaff(record.driver_id, actor)

  if (patch.vehicleId) record.vehicle_id = patch.vehicleId
  if (patch.vehiclePlate) record.vehicle_plate = patch.vehiclePlate
  if (patch.changeDate) record.change_date = patch.changeDate
  if (patch.kmAtChange != null) record.km_at_change = patch.kmAtChange
  if (patch.nextChangeKm != null) record.next_change_km = patch.nextChangeKm
  if (patch.oilType) record.oil_type = patch.oilType
  if (patch.serviceCost != null) record.service_cost = patch.serviceCost
  if (patch.notes !== undefined) record.notes = patch.notes
  if (patch.attachments) record.attachments = patch.attachments

  saveDB()
  return record
}

export async function deleteTrocaDeOleo(id: string, actor: Actor): Promise<void> {
  await simulateLatency()
  const db = getDB()
  const record = db.oleo.find((r) => r.id === id)
  if (!record) throw new ApiError("NOT_FOUND", "Registro não encontrado.")
  assertOwnerOrStaff(record.driver_id, actor)

  db.oleo = db.oleo.filter((r) => r.id !== id)
  saveDB()
}
