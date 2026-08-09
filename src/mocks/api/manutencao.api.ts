import type { Attachment, RegistroManutencao } from "@/types/entities"
import type { MaintenanceType } from "@/types/enums"
import { getDB, saveDB } from "../db/store"
import { generateId, nowIso } from "../db/ids"
import { simulateLatency } from "./shared/latency"
import { ApiError } from "./shared/errors"
import { assertOwnerOrStaff, visibleToActor } from "./shared/ownership"
import type { Actor } from "./shared/actor"

export async function listRegistrosManutencao(actor: Actor): Promise<RegistroManutencao[]> {
  await simulateLatency()
  return visibleToActor(getDB().manutencao, actor)
}

export interface CreateMaintenanceInput {
  vehicleId: string
  vehiclePlate: string
  maintenanceType: MaintenanceType
  currentKm: number
  serviceCost: number
  maintenanceDate: string
  notes?: string
  attachments?: Attachment[]
}

export async function createRegistroManutencao(
  input: CreateMaintenanceInput,
  actor: Actor,
): Promise<RegistroManutencao> {
  await simulateLatency()
  if (actor.role !== "motorista" || !actor.driverId) {
    throw new ApiError("FORBIDDEN", "Apenas motoristas registram a própria manutenção.")
  }

  const db = getDB()
  const timestamp = nowIso()
  const record: RegistroManutencao = {
    id: generateId("manutencao"),
    vehicle_id: input.vehicleId,
    driver_id: actor.driverId,
    vehicle_plate: input.vehiclePlate,
    maintenance_type: input.maintenanceType,
    current_km: input.currentKm,
    service_cost: input.serviceCost,
    maintenance_date: input.maintenanceDate,
    notes: input.notes,
    attachments: input.attachments ?? [],
    created_at: timestamp,
    updated_at: timestamp,
  }
  db.manutencao.push(record)
  saveDB()
  return record
}

export async function updateRegistroManutencao(
  id: string,
  patch: Partial<CreateMaintenanceInput>,
  actor: Actor,
): Promise<RegistroManutencao> {
  await simulateLatency()
  const db = getDB()
  const record = db.manutencao.find((r) => r.id === id)
  if (!record) throw new ApiError("NOT_FOUND", "Registro não encontrado.")
  assertOwnerOrStaff(record.driver_id, actor)

  if (patch.vehicleId) record.vehicle_id = patch.vehicleId
  if (patch.vehiclePlate) record.vehicle_plate = patch.vehiclePlate
  if (patch.maintenanceType) record.maintenance_type = patch.maintenanceType
  if (patch.currentKm != null) record.current_km = patch.currentKm
  if (patch.serviceCost != null) record.service_cost = patch.serviceCost
  if (patch.maintenanceDate) record.maintenance_date = patch.maintenanceDate
  if (patch.notes !== undefined) record.notes = patch.notes
  if (patch.attachments) record.attachments = patch.attachments
  record.updated_at = nowIso()

  saveDB()
  return record
}

export async function deleteRegistroManutencao(id: string, actor: Actor): Promise<void> {
  await simulateLatency()
  const db = getDB()
  const record = db.manutencao.find((r) => r.id === id)
  if (!record) throw new ApiError("NOT_FOUND", "Registro não encontrado.")
  assertOwnerOrStaff(record.driver_id, actor)

  db.manutencao = db.manutencao.filter((r) => r.id !== id)
  saveDB()
}
