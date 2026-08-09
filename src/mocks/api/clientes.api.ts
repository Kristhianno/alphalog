import type { Cliente } from "@/types/entities"
import { getDB, saveDB } from "../db/store"
import { generateId, nowIso } from "../db/ids"
import { simulateLatency } from "./shared/latency"
import { ApiError } from "./shared/errors"
import { isStaff, type Actor } from "./shared/actor"

/** Leitura ampla para qualquer autenticado (doc/03) — necessário para o formulário de solicitação. */
export async function listClientes(): Promise<Cliente[]> {
  await simulateLatency()
  return getDB().clientes
}

export type CreateClienteInput = Omit<Cliente, "id" | "created_at" | "updated_at">

export async function createCliente(input: CreateClienteInput, actor: Actor): Promise<Cliente> {
  await simulateLatency()
  if (!isStaff(actor)) throw new ApiError("FORBIDDEN", "Apenas a administração cadastra clientes.")

  const db = getDB()
  const timestamp = nowIso()
  const cliente: Cliente = { ...input, id: generateId("cliente"), created_at: timestamp, updated_at: timestamp }
  db.clientes.push(cliente)
  saveDB()
  return cliente
}

export async function updateCliente(
  id: string,
  patch: Partial<CreateClienteInput>,
  actor: Actor,
): Promise<Cliente> {
  await simulateLatency()
  if (!isStaff(actor)) throw new ApiError("FORBIDDEN", "Apenas a administração edita clientes.")

  const db = getDB()
  const cliente = db.clientes.find((c) => c.id === id)
  if (!cliente) throw new ApiError("NOT_FOUND", "Cliente não encontrado.")

  Object.assign(cliente, patch)
  cliente.updated_at = nowIso()
  saveDB()
  return cliente
}
