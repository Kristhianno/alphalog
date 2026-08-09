import type { Attachment, LogCombustivel } from "@/types/entities"
import type { FuelType } from "@/types/enums"
import { getDB, saveDB } from "../db/store"
import { generateId, nowIso } from "../db/ids"
import { simulateLatency } from "./shared/latency"
import { ApiError } from "./shared/errors"
import { assertOwnerOrStaff, visibleToActor } from "./shared/ownership"
import type { Actor } from "./shared/actor"

export async function listLogsCombustivel(actor: Actor): Promise<LogCombustivel[]> {
  await simulateLatency()
  return visibleToActor(getDB().combustivel, actor)
}

export interface CreateFuelLogInput {
  vehicleId: string
  vehiclePlate: string
  logDate: string
  kmInitial: number
  kmFinal: number
  liters: number
  fuelPrice: number
  fuelType: FuelType
  notes?: string
  attachments?: Attachment[]
}

export async function createLogCombustivel(
  input: CreateFuelLogInput,
  actor: Actor,
): Promise<LogCombustivel> {
  await simulateLatency()
  if (actor.role !== "motorista" || !actor.driverId) {
    throw new ApiError("FORBIDDEN", "Apenas motoristas registram o próprio abastecimento.")
  }
  if (input.kmFinal < input.kmInitial) {
    throw new ApiError("VALIDATION", "O KM final não pode ser menor que o KM inicial.")
  }

  const db = getDB()
  const timestamp = nowIso()
  const record: LogCombustivel = {
    id: generateId("combustivel"),
    vehicle_id: input.vehicleId,
    driver_id: actor.driverId,
    vehicle_plate: input.vehiclePlate,
    log_date: input.logDate,
    km_initial: input.kmInitial,
    km_final: input.kmFinal,
    liters: input.liters,
    fuel_price: input.fuelPrice,
    fuel_type: input.fuelType,
    notes: input.notes,
    attachments: input.attachments ?? [],
    created_at: timestamp,
    updated_at: timestamp,
  }
  db.combustivel.push(record)
  saveDB()
  return record
}

export async function updateLogCombustivel(
  id: string,
  patch: Partial<CreateFuelLogInput>,
  actor: Actor,
): Promise<LogCombustivel> {
  await simulateLatency()
  const db = getDB()
  const record = db.combustivel.find((r) => r.id === id)
  if (!record) throw new ApiError("NOT_FOUND", "Registro não encontrado.")
  assertOwnerOrStaff(record.driver_id, actor)

  if (patch.vehicleId) record.vehicle_id = patch.vehicleId
  if (patch.vehiclePlate) record.vehicle_plate = patch.vehiclePlate
  if (patch.logDate) record.log_date = patch.logDate
  if (patch.kmInitial != null) record.km_initial = patch.kmInitial
  if (patch.kmFinal != null) record.km_final = patch.kmFinal
  if (patch.liters != null) record.liters = patch.liters
  if (patch.fuelPrice != null) record.fuel_price = patch.fuelPrice
  if (patch.fuelType) record.fuel_type = patch.fuelType
  if (patch.notes !== undefined) record.notes = patch.notes
  if (patch.attachments) record.attachments = patch.attachments
  record.updated_at = nowIso()

  saveDB()
  return record
}

export async function deleteLogCombustivel(id: string, actor: Actor): Promise<void> {
  await simulateLatency()
  const db = getDB()
  const record = db.combustivel.find((r) => r.id === id)
  if (!record) throw new ApiError("NOT_FOUND", "Registro não encontrado.")
  assertOwnerOrStaff(record.driver_id, actor)

  db.combustivel = db.combustivel.filter((r) => r.id !== id)
  saveDB()
}
