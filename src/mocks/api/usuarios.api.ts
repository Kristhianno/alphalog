import type { Motorista, Usuario } from "@/types/entities"
import type { Role, VehicleType } from "@/types/enums"
import { getDB, saveDB } from "../db/store"
import { generateId, nowIso } from "../db/ids"
import { simulateLatency } from "./shared/latency"
import { ApiError } from "./shared/errors"
import { isAdminStrict, isStaff, type Actor } from "./shared/actor"

const SYNTHETIC_DOMAIN = "alphadata.internal"

export interface UsuarioComPapel extends Usuario {
  role: Role
  driverId?: string
}

export async function listUsuarios(actor: Actor): Promise<UsuarioComPapel[]> {
  await simulateLatency()
  if (!isStaff(actor)) throw new ApiError("FORBIDDEN", "Área restrita à administração.")

  const db = getDB()
  return db.usuarios.map((usuario) => {
    const papel = db.papeis.find((p) => p.user_id === usuario.id)
    const motorista = db.motoristas.find((m) => m.user_id === usuario.id)
    return { ...usuario, role: papel?.role ?? "cliente", driverId: motorista?.id }
  })
}

export interface CreateUsuarioInput {
  name: string
  username: string
  phone?: string
  password: string
  role: Role
  enabledVehicleTypes?: VehicleType[]
}

export async function createUsuario(
  input: CreateUsuarioInput,
  actor: Actor,
): Promise<UsuarioComPapel> {
  await simulateLatency()
  if (!isStaff(actor)) throw new ApiError("FORBIDDEN", "Apenas a administração cria usuários.")

  const db = getDB()
  const normalizedUsername = input.username.trim().toLowerCase()
  if (db.usuarios.some((u) => u.username?.toLowerCase() === normalizedUsername)) {
    throw new ApiError("VALIDATION", "Já existe um usuário com este nome de login.")
  }
  if (input.password.length < 6) {
    throw new ApiError("VALIDATION", "A senha deve ter ao menos 6 caracteres.")
  }

  const timestamp = nowIso()
  const syntheticEmail = `${normalizedUsername}@${SYNTHETIC_DOMAIN}`

  const usuario: Usuario = {
    id: generateId("user"),
    auth_id: generateId("auth"),
    name: input.name,
    username: normalizedUsername,
    email: syntheticEmail,
    password: input.password,
    phone: input.phone,
    created_at: timestamp,
    updated_at: timestamp,
  }
  db.usuarios.push(usuario)
  db.papeis.push({ id: generateId("papel"), user_id: usuario.id, role: input.role, created_at: timestamp })

  let driverId: string | undefined

  if (input.role === "motorista") {
    const motorista: Motorista = {
      id: generateId("motorista"),
      user_id: usuario.id,
      name: input.name,
      phone: input.phone ?? "",
      email: syntheticEmail,
      license_number: "",
      cnh_category: "",
      cnh_valid_until: "",
      is_fixed: true,
      enabled_vehicle_types: input.enabledVehicleTypes ?? [],
      status: "ativo",
      created_at: timestamp,
      updated_at: timestamp,
    }
    db.motoristas.push(motorista)
    driverId = motorista.id
  }

  saveDB()
  return { ...usuario, role: input.role, driverId }
}

export interface UpdateUsuarioInput {
  name?: string
  username?: string
  phone?: string
  role?: Role
  enabledVehicleTypes?: VehicleType[]
}

export async function updateUsuario(
  id: string,
  patch: UpdateUsuarioInput,
  actor: Actor,
): Promise<UsuarioComPapel> {
  await simulateLatency()
  if (!isStaff(actor)) throw new ApiError("FORBIDDEN", "Apenas a administração edita usuários.")

  const db = getDB()
  const usuario = db.usuarios.find((u) => u.id === id)
  if (!usuario) throw new ApiError("NOT_FOUND", "Usuário não encontrado.")

  if (patch.name) usuario.name = patch.name
  if (patch.phone !== undefined) usuario.phone = patch.phone
  if (patch.username && usuario.username) {
    const normalized = patch.username.trim().toLowerCase()
    usuario.username = normalized
    usuario.email = `${normalized}@${SYNTHETIC_DOMAIN}`
  }
  usuario.updated_at = nowIso()

  const papel = db.papeis.find((p) => p.user_id === id)
  const previousRole = papel?.role ?? "cliente"
  if (patch.role && papel) papel.role = patch.role
  const currentRole = papel?.role ?? "cliente"

  let motorista = db.motoristas.find((m) => m.user_id === id)

  if (currentRole === "motorista") {
    if (!motorista) {
      motorista = {
        id: generateId("motorista"),
        user_id: id,
        name: usuario.name,
        phone: usuario.phone ?? "",
        email: usuario.email,
        license_number: "",
        cnh_category: "",
        cnh_valid_until: "",
        is_fixed: true,
        enabled_vehicle_types: patch.enabledVehicleTypes ?? [],
        status: "ativo",
        created_at: nowIso(),
        updated_at: nowIso(),
      }
      db.motoristas.push(motorista)
    } else {
      motorista.name = usuario.name
      motorista.phone = usuario.phone ?? motorista.phone
      // seleção de tipos de veículo é limpa automaticamente se o papel muda para longe de
      // motorista (doc/04) — o inverso (voltar a ser motorista) começa do que foi enviado agora.
      if (patch.enabledVehicleTypes) motorista.enabled_vehicle_types = patch.enabledVehicleTypes
      motorista.updated_at = nowIso()
    }
  } else if (previousRole === "motorista" && motorista) {
    motorista.enabled_vehicle_types = []
    motorista.updated_at = nowIso()
  }

  saveDB()
  return { ...usuario, role: currentRole, driverId: motorista?.id }
}

export async function resetSenha(id: string, newPassword: string, actor: Actor): Promise<void> {
  await simulateLatency()
  if (!isStaff(actor)) throw new ApiError("FORBIDDEN", "Apenas a administração redefine senhas.")
  if (newPassword.length < 6) {
    throw new ApiError("VALIDATION", "A senha deve ter ao menos 6 caracteres.")
  }

  const db = getDB()
  const usuario = db.usuarios.find((u) => u.id === id)
  if (!usuario) throw new ApiError("NOT_FOUND", "Usuário não encontrado.")

  usuario.password = newPassword
  usuario.updated_at = nowIso()
  saveDB()
}

export async function deleteUsuario(id: string, actor: Actor): Promise<void> {
  await simulateLatency()
  if (!isAdminStrict(actor)) {
    throw new ApiError("FORBIDDEN", "Apenas o administrador pode excluir usuários.")
  }
  if (actor.userId === id) {
    throw new ApiError("VALIDATION", "Não é possível excluir a própria conta.")
  }

  const db = getDB()
  const usuario = db.usuarios.find((u) => u.id === id)
  if (!usuario) throw new ApiError("NOT_FOUND", "Usuário não encontrado.")

  db.usuarios = db.usuarios.filter((u) => u.id !== id)
  db.papeis = db.papeis.filter((p) => p.user_id !== id)
  const motorista = db.motoristas.find((m) => m.user_id === id)
  if (motorista) motorista.user_id = undefined

  saveDB()
}
