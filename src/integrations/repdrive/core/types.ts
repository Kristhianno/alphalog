import type { Actor } from "@/mocks/api/shared/actor"
import type { Role } from "@/types/enums"

/**
 * Quem está perguntando pelo WhatsApp. Sempre montado pelo Repdrive (persona da demo ou,
 * na fase 2, telefone + instância) — nunca a partir do que o modelo de IA escreveu.
 */
export interface RepdriveActor extends Actor {
  companyId: string
}

export type ToolArgs = Record<string, string | number | undefined>

export interface ToolParam {
  name: string
  description: string
  type: "string" | "number"
}

export interface ToolDef<Ctx> {
  name: string
  description: string
  roles: Role[]
  params: ToolParam[]
  run: (ctx: Ctx, actor: RepdriveActor, args: ToolArgs) => string
}

/** Um sistema de origem (AlphaLog, um ERP, um CRM…) plugado ao agente. */
export interface Connector<Ctx = unknown> {
  id: string
  load: (actor: RepdriveActor) => Ctx
  tools: ToolDef<Ctx>[]
}
