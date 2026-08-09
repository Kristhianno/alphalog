import { getDB, saveDB } from "../db/store"
import { generateId, nowIso } from "../db/ids"
import { simulateLatency } from "./shared/latency"
import { ApiError } from "./shared/errors"
import type { Actor } from "./shared/actor"
import type { Cliente, PapelDeUsuario, Usuario } from "@/types/entities"
import type { Role } from "@/types/enums"

export interface Session {
  user: Usuario
  role: Role
}

function toSession(user: Usuario, papeis: PapelDeUsuario[]): Session {
  const papel = papeis.find((p) => p.user_id === user.id)
  return { user, role: papel?.role ?? "cliente" }
}

/** Deriva o `Actor` (contexto tipo-RLS) a partir da sessão — resolve driverId/clientId vinculados. */
export function buildActor(session: Session): Actor {
  const db = getDB()

  if (session.role === "motorista") {
    const motorista = db.motoristas.find((m) => m.user_id === session.user.id)
    return { userId: session.user.id, role: session.role, driverId: motorista?.id }
  }

  if (session.role === "cliente") {
    const cliente = db.clientes.find(
      (c) => c.linked_user_email?.toLowerCase() === session.user.email.toLowerCase(),
    )
    return { userId: session.user.id, role: session.role, clientId: cliente?.id }
  }

  return { userId: session.user.id, role: session.role }
}

export function findUsuarioById(id: string): Usuario | undefined {
  return getDB().usuarios.find((u) => u.id === id)
}

export function currentSessionForUser(userId: string): Session | undefined {
  const db = getDB()
  const user = db.usuarios.find((u) => u.id === userId)
  if (!user) return undefined
  return toSession(user, db.papeis)
}

/**
 * Login por usuário (staff/motorista) ou e-mail (cliente autocadastrado) — ambos usam
 * o mesmo formulário na tela de Login, então aceitamos qualquer um dos dois aqui.
 */
export async function login(identifier: string, password: string): Promise<Session> {
  await simulateLatency()
  const db = getDB()
  const normalized = identifier.trim().toLowerCase()

  const user = db.usuarios.find(
    (u) => u.username?.toLowerCase() === normalized || u.email.toLowerCase() === normalized,
  )

  if (!user || user.password !== password) {
    throw new ApiError("VALIDATION", "Usuário/e-mail ou senha inválidos.")
  }

  return toSession(user, db.papeis)
}

/**
 * Autocadastro público: sempre nasce Cliente, exceto se for literalmente a primeira
 * conta do sistema (bootstrap do primeiro admin, regra 12) — cenário improvável aqui já
 * que o app vem pré-semeado, mas mantido fiel à regra.
 */
export async function register(params: {
  name: string
  email: string
  password: string
}): Promise<Session> {
  await simulateLatency()
  const db = getDB()

  const normalizedEmail = params.email.trim().toLowerCase()
  if (db.usuarios.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    throw new ApiError("VALIDATION", "Já existe uma conta com este e-mail.")
  }

  const isFirstEverUser = db.papeis.length === 0
  const role: Role = isFirstEverUser ? "admin" : "cliente"
  const timestamp = nowIso()

  const user: Usuario = {
    id: generateId("user"),
    auth_id: generateId("auth"),
    name: params.name,
    email: params.email,
    password: params.password,
    created_at: timestamp,
    updated_at: timestamp,
  }
  db.usuarios.push(user)

  const papel: PapelDeUsuario = {
    id: generateId("papel"),
    user_id: user.id,
    role,
    created_at: timestamp,
  }
  db.papeis.push(papel)

  if (role === "cliente") {
    // Simplificação do protótipo: o autocadastro já cria o cadastro de cliente vinculado
    // por e-mail, para a conta poder usar a tela de Solicitações imediatamente.
    const cliente: Cliente = {
      id: generateId("cliente"),
      name: params.name,
      email: params.email,
      phone: "",
      document: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      region: "",
      linked_user_email: params.email,
      created_at: timestamp,
      updated_at: timestamp,
    }
    db.clientes.push(cliente)
  }

  saveDB()
  return toSession(user, db.papeis)
}
