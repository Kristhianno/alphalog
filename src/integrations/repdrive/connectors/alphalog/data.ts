import type { AiContext } from "@/features/ai-assistant/aiEngine"
import type { DB } from "@/mocks/db/schema"
import { buildSeedDatabase } from "@/mocks/db/seed"
import { isStaff } from "@/mocks/api/shared/actor"
import type { Solicitacao } from "@/types/entities"
import type { RepdriveActor } from "../../core/types"

export interface AlphaLogCtx {
  db: DB
  /** mesmo formato que a tela do Assistente IA usa — permite reaproveitar o aiEngine inteiro */
  ai: AiContext
}

/**
 * MVP: os dados vêm do mesmo seed fictício do app (datas relativas a "agora", então a demo
 * nunca fica velha). Na migração para o Supabase só esta função muda.
 */
export function loadAlphaLog(): AlphaLogCtx {
  const db = buildSeedDatabase()
  const usuarios = db.usuarios.map((u) => ({
    ...u,
    role: db.papeis.find((p) => p.user_id === u.id)?.role ?? "cliente",
    driverId: db.motoristas.find((m) => m.user_id === u.id)?.id,
  }))

  return {
    db,
    ai: {
      solicitacoes: db.solicitacoes,
      motoristas: db.motoristas,
      veiculos: db.veiculos,
      clientes: db.clientes,
      usuarios,
      precos: db.precos,
      combustivel: db.combustivel,
      oleo: db.oleo,
      manutencao: db.manutencao,
      checklists: db.checklists,
      pausasAlmoco: db.pausasAlmoco,
      localizacoes: db.localizacoes,
    },
  }
}

/** Equivalente ao RLS de `solicitacoes` (doc/02): staff vê tudo, motorista e cliente só o que é seu. */
export function visibleRequests(db: DB, actor: RepdriveActor): Solicitacao[] {
  if (isStaff(actor)) return db.solicitacoes
  if (actor.role === "motorista") return db.solicitacoes.filter((r) => r.driver_id === actor.driverId)
  if (actor.role === "cliente") return db.solicitacoes.filter((r) => r.client_id === actor.clientId)
  return []
}

export function findVisibleRequest(
  db: DB,
  actor: RepdriveActor,
  numero: string | number | undefined,
): Solicitacao | undefined {
  const n = Number(String(numero ?? "").replace(/\D/g, ""))
  if (!n) return undefined
  return visibleRequests(db, actor).find((r) => r.request_number === n)
}
