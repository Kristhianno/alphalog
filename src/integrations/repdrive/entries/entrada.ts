import "./polyfills"
import { routeDemoMessage, finalizeReply, type DemoSession } from "../demo/router"

/**
 * Lógica do nó "Roteador" do workflow n8n "Repdrive Entrada". Recebe o corpo do webhook da
 * Evolution API (evento messages.upsert) e decide: ignorar, responder direto (menu) ou
 * mandar para o agente de IA.
 */

export interface EntradaConfig {
  /** JIDs fixos dos grupos de demonstração (ex.: 1203630...@g.us). Também dá para ativar com /repdrive-ativar */
  demoGroupJids: string[]
  /** sobrescrevem server_url / apikey que a própria Evolution manda no webhook */
  evolutionUrl?: string
  evolutionApiKey?: string
}

export interface EntradaState {
  sessions?: Record<string, DemoSession>
  seen?: string[]
  /** grupos ativados com /repdrive-ativar (além dos fixos em EntradaConfig) */
  demoGroups?: string[]
}

export interface SendPayload {
  url: string
  apikey: string
  body: {
    number: string
    text: string
    quoted?: { key: { id: string; remoteJid: string; fromMe: boolean; participant?: string }; message: { conversation: string } }
  }
}

export type EntradaOutput =
  | { action: "send"; send: SendPayload }
  | { action: "agent"; chatInput: string; systemPrompt: string; memoryKey: string; persona: string; send: SendPayload }

interface EvolutionMessage {
  key?: { remoteJid?: string; fromMe?: boolean; id?: string; participant?: string; participantAlt?: string }
  participant?: string
  pushName?: string
  message?: {
    conversation?: string
    extendedTextMessage?: { text?: string }
    imageMessage?: { caption?: string }
    videoMessage?: { caption?: string }
  }
  messageType?: string
}

const SESSION_TTL_MS = 24 * 60 * 60_000
const SEEN_LIMIT = 300

function extractText(m: EvolutionMessage): string | undefined {
  return (
    m.message?.conversation ??
    m.message?.extendedTextMessage?.text ??
    m.message?.imageMessage?.caption ??
    m.message?.videoMessage?.caption
  )?.trim()
}

export function handleWebhook(
  body: Record<string, unknown>,
  state: EntradaState,
  config: EntradaConfig,
  now = Date.now(),
): EntradaOutput | null {
  const event = String(body.event ?? "").toLowerCase().replace(/_/g, ".")
  if (event !== "messages.upsert") return null

  const raw = body.data as EvolutionMessage | EvolutionMessage[] | undefined
  const msg = Array.isArray(raw) ? raw[0] : raw
  const key = msg?.key
  if (!msg || !key?.remoteJid || !key.id || key.fromMe) return null

  // Evolution reenvia o mesmo evento às vezes — responde uma vez só
  state.seen = state.seen ?? []
  if (state.seen.includes(key.id)) return null
  state.seen.push(key.id)
  if (state.seen.length > SEEN_LIMIT) state.seen.splice(0, state.seen.length - SEEN_LIMIT)

  const remoteJid = key.remoteJid
  if (!remoteJid.endsWith("@g.us")) return null // fase 1: só o grupo de demonstração

  const text = extractText(msg)
  const participant = key.participant ?? msg.participant ?? ""
  const instance = String(body.instance ?? "")
  const baseUrl = (config.evolutionUrl || String(body.server_url ?? "")).replace(/\/+$/, "")
  const send = (reply: string): SendPayload => ({
    url: `${baseUrl}/message/sendText/${encodeURIComponent(instance)}`,
    apikey: config.evolutionApiKey || String(body.apikey ?? ""),
    body: {
      number: remoteJid,
      text: reply,
      quoted: {
        key: { id: key.id!, remoteJid, fromMe: false, participant: participant || undefined },
        message: { conversation: text ?? "" },
      },
    },
  })

  // Comandos de administração: ligam/desligam a demo num grupo sem editar o workflow
  state.demoGroups = state.demoGroups ?? []
  const command = text?.toLowerCase()
  if (command === "/repdrive-id") {
    return { action: "send", send: send(`ID deste grupo: ${remoteJid}`) }
  }
  if (command === "/repdrive-ativar") {
    if (!state.demoGroups.includes(remoteJid)) state.demoGroups.push(remoteJid)
    return { action: "send", send: send("✅ Demonstração do Repdrive ativada neste grupo. Mande qualquer mensagem para abrir o menu.") }
  }
  if (command === "/repdrive-desativar") {
    state.demoGroups = state.demoGroups.filter((g) => g !== remoteJid)
    return { action: "send", send: send("⏸️ Demonstração do Repdrive desativada neste grupo.") }
  }
  if (!config.demoGroupJids.includes(remoteJid) && !state.demoGroups.includes(remoteJid)) return null

  const sessionKey = sessionKeyOf(body) ?? `${remoteJid}|${participant}`
  state.sessions = state.sessions ?? {}
  pruneSessions(state.sessions, now)

  if (!text) {
    const active = state.sessions[sessionKey]?.persona
    return active
      ? { action: "send", send: send("Por enquanto eu respondo só mensagens de texto. Pode digitar sua pergunta? 🙂") }
      : null
  }

  const route = routeDemoMessage({
    session: state.sessions[sessionKey],
    sessionKey,
    text,
    now,
    pushName: msg.pushName,
  })
  state.sessions[sessionKey] = route.session

  if (route.kind === "send") return { action: "send", send: send(route.text) }
  return {
    action: "agent",
    chatInput: text,
    systemPrompt: route.systemPrompt,
    memoryKey: route.memoryKey,
    persona: route.persona,
    send: send(""),
  }
}

/**
 * Chave da sessão do lead (grupo + participante) — o workflow a usa para ler/gravar a sessão
 * no Redis antes/depois do Roteador, uma chave por lead, sem disputa entre execuções paralelas.
 */
export function sessionKeyOf(body: Record<string, unknown>): string | null {
  const raw = body.data as EvolutionMessage | EvolutionMessage[] | undefined
  const msg = Array.isArray(raw) ? raw[0] : raw
  if (!msg?.key?.remoteJid) return null
  return `${msg.key.remoteJid}|${msg.key.participant ?? msg.participant ?? ""}`
}

function pruneSessions(sessions: Record<string, DemoSession>, now: number): void {
  for (const [k, s] of Object.entries(sessions)) {
    if (now - s.last > SESSION_TTL_MS) delete sessions[k]
  }
}

export { finalizeReply }
