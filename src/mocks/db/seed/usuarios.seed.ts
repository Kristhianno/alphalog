import type { PapelDeUsuario, Usuario } from "@/types/entities"
import { isoAtOffset } from "./dateHelpers"

/**
 * 7 contas fictícias fixas — a base da autenticação mock (ver plano). Contas de staff/
 * motorista usam login por usuário (e-mail sintético @alphadata.internal); contas de
 * cliente simulam autocadastro (e-mail real, papel Cliente nasce automático).
 */
export const SEED_USER_IDS = {
  admin: "user-admin",
  gestor: "user-gestor",
  assistente: "user-assistente",
  motoristaJoao: "user-motorista-joao",
  motoristaMarcia: "user-motorista-marcia",
  clienteRoberto: "user-cliente-roberto",
  clienteJuliana: "user-cliente-juliana",
} as const

export function seedUsuarios(): { usuarios: Usuario[]; papeis: PapelDeUsuario[] } {
  const createdAt = isoAtOffset(-180)

  const usuarios: Usuario[] = [
    {
      id: SEED_USER_IDS.admin,
      auth_id: SEED_USER_IDS.admin,
      name: "Ana Beatriz Ramos",
      username: "admin",
      email: "admin@alphadata.internal",
      password: "admin123",
      phone: "(11) 98211-4400",
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: SEED_USER_IDS.gestor,
      auth_id: SEED_USER_IDS.gestor,
      name: "Carlos Eduardo Lima",
      username: "gestor",
      email: "gestor@alphadata.internal",
      password: "gestor123",
      phone: "(11) 98322-5511",
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: SEED_USER_IDS.assistente,
      auth_id: SEED_USER_IDS.assistente,
      name: "Fernanda Souza Alves",
      username: "assistente",
      email: "assistente@alphadata.internal",
      password: "assistente123",
      phone: "(11) 98433-6622",
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: SEED_USER_IDS.motoristaJoao,
      auth_id: SEED_USER_IDS.motoristaJoao,
      name: "João Pedro Nascimento",
      username: "joao.motorista",
      email: "joao.motorista@alphadata.internal",
      password: "motorista123",
      phone: "(11) 98544-7733",
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: SEED_USER_IDS.motoristaMarcia,
      auth_id: SEED_USER_IDS.motoristaMarcia,
      name: "Márcia Helena Duarte",
      username: "marcia.motorista",
      email: "marcia.motorista@alphadata.internal",
      password: "motorista123",
      phone: "(11) 98655-8844",
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: SEED_USER_IDS.clienteRoberto,
      auth_id: SEED_USER_IDS.clienteRoberto,
      name: "Roberto Carlos Mendes",
      email: "roberto.mendes@transportesloja.com.br",
      password: "cliente123",
      phone: "(11) 98766-9955",
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: SEED_USER_IDS.clienteJuliana,
      auth_id: SEED_USER_IDS.clienteJuliana,
      name: "Juliana Paes Barreto",
      email: "juliana.barreto@construplus.com.br",
      password: "cliente123",
      phone: "(11) 98877-1122",
      created_at: createdAt,
      updated_at: createdAt,
    },
  ]

  const papeis: PapelDeUsuario[] = [
    { id: "papel-admin", user_id: SEED_USER_IDS.admin, role: "admin", created_at: createdAt },
    { id: "papel-gestor", user_id: SEED_USER_IDS.gestor, role: "gestor", created_at: createdAt },
    {
      id: "papel-assistente",
      user_id: SEED_USER_IDS.assistente,
      role: "assistente_logistico",
      created_at: createdAt,
    },
    {
      id: "papel-motorista-joao",
      user_id: SEED_USER_IDS.motoristaJoao,
      role: "motorista",
      created_at: createdAt,
    },
    {
      id: "papel-motorista-marcia",
      user_id: SEED_USER_IDS.motoristaMarcia,
      role: "motorista",
      created_at: createdAt,
    },
    {
      id: "papel-cliente-roberto",
      user_id: SEED_USER_IDS.clienteRoberto,
      role: "cliente",
      created_at: createdAt,
    },
    {
      id: "papel-cliente-juliana",
      user_id: SEED_USER_IDS.clienteJuliana,
      role: "cliente",
      created_at: createdAt,
    },
  ]

  return { usuarios, papeis }
}
