import { MENU_FOOTER, menuText, personaByOption, personaFor, systemPrompt, type PersonaId } from "./personas"

export const SESSION_TIMEOUT_MS = 30 * 60_000
const MENU_WORDS = ["4", "menu", "voltar", "inicio", "sair", "0"]

export interface DemoSession {
  persona: PersonaId | null
  /** muda a cada troca de perfil/menu — entra no id da memória do agente, que assim "zera" */
  epoch: number
  last: number
  /** cliente fictício atribuído a este lead no perfil Cliente (fixo durante a sessão) */
  clientId?: string
  /** a conversa segue no privado do lead (iniciada pelo grupo) */
  privado?: boolean
  /** sessão encerrada (inatividade ou "encerrar") — o privado volta a ser só do atendimento humano */
  ended?: boolean
}

export type DemoRoute =
  | { kind: "send"; text: string; session: DemoSession }
  | {
      kind: "agent"
      persona: PersonaId
      clientId?: string
      memoryKey: string
      systemPrompt: string
      session: DemoSession
    }

// opções faladas em áudio ("um", "opção dois", "o três") viram o número do menu
const SPOKEN_OPTIONS: Record<string, string> = { um: "1", uma: "1", dois: "2", duas: "2", tres: "3", quatro: "4" }

// "quero ser gestor", "sou motorista", "perfil cliente", "opção 2"… → só o que interessa
const FILLER = /^(quero ser|quero|sou|perfil de|perfil|modo|opcao|numero|escolho|vou de|o|a)\s+/

export function normalizeCommand(s: string): string {
  let t = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9/\s]+/g, " ") // emojis, pontuação e "1 - gestor"
    .replace(/\s+/g, " ")
    .trim()
  while (FILLER.test(t)) t = t.replace(FILLER, "")
  return SPOKEN_OPTIONS[t] ?? t
}

/**
 * Máquina de estados do menu da demo. Pura (sem I/O) para ser testável; quem chama guarda
 * a sessão devolvida. `sessionKey` identifica o lead; `assignClient` sorteia o cliente
 * fictício na primeira vez que o lead escolhe o perfil Cliente.
 */
export function routeDemoMessage(params: {
  session: DemoSession | undefined
  sessionKey: string
  text: string
  now: number
  pushName?: string
  assignClient?: () => string
}): DemoRoute {
  const prev: DemoSession = params.session ?? { persona: null, epoch: 0, last: 0 }
  const t = normalizeCommand(params.text)
  const expired = prev.persona !== null && params.now - prev.last > SESSION_TIMEOUT_MS
  const chosen = personaByOption(t)

  if (chosen) {
    const clientId = chosen.id === "cliente" ? (prev.clientId ?? params.assignClient?.()) : prev.clientId
    const persona = personaFor(chosen.id, clientId)
    const session = { ...prev, persona: chosen.id, clientId, epoch: prev.epoch + 1, last: params.now }
    return { kind: "send", text: `${persona.intro}\n\n${MENU_FOOTER}`, session }
  }

  if (prev.persona === null || expired || MENU_WORDS.includes(t)) {
    const session = { ...prev, persona: null, epoch: prev.persona === null ? prev.epoch : prev.epoch + 1, last: params.now }
    const prefix = expired ? "⏱️ Sua sessão de teste expirou por inatividade.\n\n" : ""
    return { kind: "send", text: prefix + menuText(params.pushName), session }
  }

  const session = { ...prev, last: params.now }
  return {
    kind: "agent",
    persona: prev.persona,
    clientId: prev.persona === "cliente" ? prev.clientId : undefined,
    memoryKey: `${params.sessionKey}#${prev.epoch}`,
    systemPrompt: systemPrompt(personaFor(prev.persona, prev.clientId), new Date(params.now)),
    session,
  }
}

/** Ajusta o texto do modelo ao WhatsApp (caso escape markdown) e acrescenta o rodapé do menu. */
export function finalizeReply(raw: string | undefined): string {
  const text = (raw ?? "").trim()
  if (!text) {
    return `Tive um problema para consultar agora. Pode repetir a pergunta em instantes?\n\n${MENU_FOOTER}`
  }
  const cleaned = text
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/__(.+?)__/g, "_$1_")
    .replace(/^#{1,6}\s+(.+)$/gm, "*$1*")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
  return `${cleaned}\n\n${MENU_FOOTER}`
}
