import { MENU_FOOTER, PERSONAS, menuText, personaByOption, systemPrompt, type PersonaId } from "./personas"

export const SESSION_TIMEOUT_MS = 30 * 60_000
const MENU_WORDS = ["4", "menu", "voltar", "inicio", "sair", "0"]

export interface DemoSession {
  persona: PersonaId | null
  /** muda a cada troca de perfil/menu — entra no id da memória do agente, que assim "zera" */
  epoch: number
  last: number
}

export type DemoRoute =
  | { kind: "send"; text: string; session: DemoSession }
  | { kind: "agent"; persona: PersonaId; memoryKey: string; systemPrompt: string; session: DemoSession }

// opções faladas em áudio ("um", "opção dois", "o três") viram o número do menu
const SPOKEN_OPTIONS: Record<string, string> = { um: "1", uma: "1", dois: "2", duas: "2", tres: "3", quatro: "4" }

function normalize(s: string): string {
  const t = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[.!*,]+$/, "")
  return SPOKEN_OPTIONS[t.replace(/^(opcao|numero|o|a)\s+/, "")] ?? t
}

/**
 * Máquina de estados do menu da demo. Pura (sem I/O) para ser testável; quem chama guarda
 * a sessão devolvida. `sessionKey` identifica o lead dentro do grupo (grupo + participante).
 */
export function routeDemoMessage(params: {
  session: DemoSession | undefined
  sessionKey: string
  text: string
  now: number
  pushName?: string
}): DemoRoute {
  const prev = params.session ?? { persona: null, epoch: 0, last: 0 }
  const t = normalize(params.text)
  const expired = prev.persona !== null && params.now - prev.last > SESSION_TIMEOUT_MS
  const chosen = personaByOption(t)

  if (chosen) {
    const session = { persona: chosen.id, epoch: prev.epoch + 1, last: params.now }
    return { kind: "send", text: `${chosen.intro}\n\n${MENU_FOOTER}`, session }
  }

  if (prev.persona === null || expired || MENU_WORDS.includes(t)) {
    const session = { persona: null, epoch: prev.persona === null ? prev.epoch : prev.epoch + 1, last: params.now }
    const prefix = expired ? "⏱️ Sua sessão de teste expirou por inatividade.\n\n" : ""
    return { kind: "send", text: prefix + menuText(params.pushName), session }
  }

  const session = { ...prev, last: params.now }
  return {
    kind: "agent",
    persona: prev.persona,
    memoryKey: `${params.sessionKey}#${prev.epoch}`,
    systemPrompt: systemPrompt(PERSONAS[prev.persona], new Date(params.now)),
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
