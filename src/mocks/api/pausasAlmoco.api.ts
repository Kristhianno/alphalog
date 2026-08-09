import type { Attachment, PausaAlmoco } from "@/types/entities"
import { getDB, saveDB } from "../db/store"
import { generateId, nowIso } from "../db/ids"
import { simulateLatency } from "./shared/latency"
import { ApiError } from "./shared/errors"
import { assertOwnerOrStaff, visibleToActor } from "./shared/ownership"
import type { Actor } from "./shared/actor"

export async function listPausasAlmoco(actor: Actor): Promise<PausaAlmoco[]> {
  await simulateLatency()
  return visibleToActor(getDB().pausasAlmoco, actor)
}

export interface CreateLunchBreakInput {
  employeeName: string
  breakDate: string
  exitTime: string
  returnTime?: string
  observacoes?: string
  attachments?: Attachment[]
  valor?: number
}

export async function createPausaAlmoco(
  input: CreateLunchBreakInput,
  actor: Actor,
): Promise<PausaAlmoco> {
  await simulateLatency()
  if (actor.role !== "motorista" || !actor.driverId) {
    throw new ApiError("FORBIDDEN", "Apenas motoristas registram a própria pausa de almoço.")
  }

  const db = getDB()
  const timestamp = nowIso()
  const record: PausaAlmoco = {
    id: generateId("almoco"),
    driver_id: actor.driverId,
    employee_name: input.employeeName,
    break_date: input.breakDate,
    exit_time: input.exitTime,
    return_time: input.returnTime,
    observacoes: input.observacoes,
    attachments: input.attachments ?? [],
    valor: input.valor,
    created_at: timestamp,
    updated_at: timestamp,
  }
  db.pausasAlmoco.push(record)
  saveDB()
  return record
}

export async function updatePausaAlmoco(
  id: string,
  patch: Partial<CreateLunchBreakInput>,
  actor: Actor,
): Promise<PausaAlmoco> {
  await simulateLatency()
  const db = getDB()
  const record = db.pausasAlmoco.find((r) => r.id === id)
  if (!record) throw new ApiError("NOT_FOUND", "Registro não encontrado.")
  assertOwnerOrStaff(record.driver_id, actor)

  if (patch.breakDate) record.break_date = patch.breakDate
  if (patch.exitTime) record.exit_time = patch.exitTime
  if (patch.returnTime !== undefined) record.return_time = patch.returnTime
  if (patch.observacoes !== undefined) record.observacoes = patch.observacoes
  if (patch.attachments) record.attachments = patch.attachments
  if (patch.valor !== undefined) record.valor = patch.valor
  record.updated_at = nowIso()

  saveDB()
  return record
}

export async function deletePausaAlmoco(id: string, actor: Actor): Promise<void> {
  await simulateLatency()
  const db = getDB()
  const record = db.pausasAlmoco.find((r) => r.id === id)
  if (!record) throw new ApiError("NOT_FOUND", "Registro não encontrado.")
  assertOwnerOrStaff(record.driver_id, actor)

  db.pausasAlmoco = db.pausasAlmoco.filter((r) => r.id !== id)
  saveDB()
}
