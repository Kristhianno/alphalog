import type { Veiculo } from "@/types/entities"
import { getDB, saveDB } from "../db/store"
import { generateId, nowIso } from "../db/ids"
import { simulateLatency } from "./shared/latency"
import { ApiError } from "./shared/errors"
import { isStaff, type Actor } from "./shared/actor"

/** Leitura ampla para qualquer autenticado (doc/03). */
export async function listVeiculos(): Promise<Veiculo[]> {
  await simulateLatency()
  return getDB().veiculos
}

export type CreateVeiculoInput = Omit<Veiculo, "id" | "created_at" | "updated_at">

export async function createVeiculo(input: CreateVeiculoInput, actor: Actor): Promise<Veiculo> {
  await simulateLatency()
  if (!isStaff(actor)) throw new ApiError("FORBIDDEN", "Apenas a administração cadastra veículos.")

  const db = getDB()
  const timestamp = nowIso()
  const veiculo: Veiculo = { ...input, id: generateId("veiculo"), created_at: timestamp, updated_at: timestamp }
  db.veiculos.push(veiculo)
  saveDB()
  return veiculo
}

export async function updateVeiculo(
  id: string,
  patch: Partial<CreateVeiculoInput>,
  actor: Actor,
): Promise<Veiculo> {
  await simulateLatency()
  if (!isStaff(actor)) throw new ApiError("FORBIDDEN", "Apenas a administração edita veículos.")

  const db = getDB()
  const veiculo = db.veiculos.find((v) => v.id === id)
  if (!veiculo) throw new ApiError("NOT_FOUND", "Veículo não encontrado.")

  Object.assign(veiculo, patch)
  veiculo.updated_at = nowIso()
  saveDB()
  return veiculo
}
