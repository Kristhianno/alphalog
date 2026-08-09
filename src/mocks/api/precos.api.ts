import type { PrecoDeFrete } from "@/types/entities"
import type { VehicleType } from "@/types/enums"
import { getDB, saveDB } from "../db/store"
import { generateId, nowIso } from "../db/ids"
import { simulateLatency } from "./shared/latency"
import { ApiError } from "./shared/errors"
import { isStaff, type Actor } from "./shared/actor"

export async function listPrecos(actor: Actor): Promise<PrecoDeFrete[]> {
  await simulateLatency()
  const db = getDB()
  if (isStaff(actor)) return db.precos
  if (actor.role === "cliente") return db.precos.filter((p) => p.client_id === actor.clientId)
  return []
}

export interface UpsertPrecoInput {
  clientId: string
  transportType: VehicleType
  region: string
  price: number
}

export async function upsertPreco(input: UpsertPrecoInput, actor: Actor): Promise<PrecoDeFrete> {
  await simulateLatency()
  if (!isStaff(actor)) throw new ApiError("FORBIDDEN", "Apenas a administração gerencia preços.")

  const db = getDB()
  const existing = db.precos.find(
    (p) =>
      p.client_id === input.clientId &&
      p.transport_type === input.transportType &&
      p.region === input.region,
  )

  if (existing) {
    existing.price = input.price
    saveDB()
    return existing
  }

  const record: PrecoDeFrete = {
    id: generateId("preco"),
    client_id: input.clientId,
    transport_type: input.transportType,
    region: input.region,
    price: input.price,
    created_at: nowIso(),
  }
  db.precos.push(record)
  saveDB()
  return record
}

export async function deletePreco(id: string, actor: Actor): Promise<void> {
  await simulateLatency()
  if (!isStaff(actor)) throw new ApiError("FORBIDDEN", "Apenas a administração gerencia preços.")

  const db = getDB()
  db.precos = db.precos.filter((p) => p.id !== id)
  saveDB()
}
