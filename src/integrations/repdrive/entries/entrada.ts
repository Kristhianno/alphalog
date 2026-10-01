import "./polyfills"
import { routeDemoMessage, finalizeReply, normalizeCommand, SESSION_TIMEOUT_MS, type DemoSession } from "../demo/router"
import { menuText } from "../demo/personas"
import { nextDemoClient } from "../demo/clients"

/**
 * Lógica do nó "Roteador" do workflow n8n do Repdrive. Recebe o corpo do webhook da Evolution
 * API (evento messages.upsert) e devolve o que fazer: nada, mensagens diretas (menu, convite
 * para o privado) ou mandar para o agente de IA. No grupo de demonstração o lead é convidado
 * para o privado, onde a demo acontece sem que um lead veja a conversa do outro.
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
  /** fila round-robin dos clientes fictícios distribuídos aos leads */
  clientSeq?: number
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
  | {
      action: "agent"
      chatInput: string
      systemPrompt: string
      memoryKey: string
      persona: string
      clientId: string
      send: SendPayload
    }

interface EvolutionMessage {
  key?: {
    remoteJid?: string
    remoteJidAlt?: string
    fromMe?: boolean
    id?: string
    participant?: string
    participantAlt?: string
  }
  participant?: string
  pushName?: string
  message?: {
    conversation?: string
    extendedTextMessage?: { text?: string }
    imageMessage?: { caption?: string }
    videoMessage?: { caption?: string }
    audioMessage?: { mimetype?: string; seconds?: number }
    /** presente quando o webhook da Evolution está com webhookBase64 ligado */
    base64?: string
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

export interface AudioInfo {
  messageId: string
  mimetype: string
  /** pode faltar — aí o workflow baixa pela Evolution (/chat/getBase64FromMediaMessage) */
  base64?: string
  seconds?: number
}

/** Mensagem de voz/áudio recebida? (o workflow transcreve antes do Roteador) */
export function audioOf(body: Record<string, unknown>): AudioInfo | null {
  const raw = body.data as EvolutionMessage | EvolutionMessage[] | undefined
  const msg = Array.isArray(raw) ? raw[0] : raw
  const audio = msg?.message?.audioMessage
  if (!audio || !msg?.key?.id || msg.key.fromMe) return null
  return {
    messageId: msg.key.id,
    mimetype: (audio.mimetype ?? "audio/ogg").split(";")[0].trim(),
    base64: msg.message?.base64 || undefined,
    seconds: audio.seconds,
  }
}

/** Troca o áudio pelo texto transcrito, para o resto do fluxo tratar como mensagem de texto. */
export function withTranscription(body: Record<string, unknown>, text: string): Record<string, unknown> {
  const raw = body.data as EvolutionMessage | EvolutionMessage[]
  const msg = Array.isArray(raw) ? raw[0] : raw
  return { ...body, transcription: text, data: { ...msg, message: { conversation: text } } }
}

const DEMO_GROUP_NAME = "Repdrive"

function onlyDigits(jid: string): string {
  return jid.split("@")[0].replace(/\D/g, "")
}

/**
 * Quem mandou a mensagem: no grupo, o participante; no privado, o próprio chat. A Evolution
 * manda o id interno (…@lid) e, em *Alt, o telefone (…@s.whatsapp.net) — preferimos o telefone,
 * que é o mesmo no grupo e no privado.
 */
function personOf(msg: EvolutionMessage): { jid: string; phone?: string } | null {
  const key = msg.key
  if (!key?.remoteJid) return null
  const isGroup = key.remoteJid.endsWith("@g.us")
  const candidates = isGroup
    ? [key.participantAlt, key.participant, msg.participant]
    : [key.remoteJidAlt, key.remoteJid]
  const phoneJid = candidates.find((j) => j?.endsWith("@s.whatsapp.net"))
  const jid = phoneJid ?? candidates.find(Boolean)
  if (!jid) return null
  return { jid, phone: phoneJid ? onlyDigits(phoneJid) : undefined }
}

export function handleWebhook(
  body: Record<string, unknown>,
  state: EntradaState,
  config: EntradaConfig,
  now = Date.now(),
): EntradaOutput[] {
  const event = String(body.event ?? "").toLowerCase().replace(/_/g, ".")
  if (event !== "messages.upsert") return []

  const raw = body.data as EvolutionMessage | EvolutionMessage[] | undefined
  const msg = Array.isArray(raw) ? raw[0] : raw
  const key = msg?.key
  if (!msg || !key?.remoteJid || !key.id || key.fromMe) return []

  // Evolution reenvia o mesmo evento às vezes — responde uma vez só
  state.seen = state.seen ?? []
  if (state.seen.includes(key.id)) return []
  state.seen.push(key.id)
  if (state.seen.length > SEEN_LIMIT) state.seen.splice(0, state.seen.length - SEEN_LIMIT)

  const remoteJid = key.remoteJid
  const isGroup = remoteJid.endsWith("@g.us")
  const text = extractText(msg)
  const person = personOf(msg)
  const instance = String(body.instance ?? "")
  const baseUrl = (config.evolutionUrl || String(body.server_url ?? "")).replace(/\/+$/, "")
  const sendTo = (number: string, reply: string, quote: boolean): SendPayload => ({
    url: `${baseUrl}/message/sendText/${encodeURIComponent(instance)}`,
    apikey: config.evolutionApiKey || String(body.apikey ?? ""),
    body: {
      number,
      text: reply,
      ...(quote
        ? {
            quoted: {
              key: { id: key.id!, remoteJid, fromMe: false, participant: key.participant || undefined },
              message: { conversation: text ?? "" },
            },
          }
        : {}),
    },
  })
  const replyHere = (reply: string): EntradaOutput => ({ action: "send", send: sendTo(remoteJid, reply, isGroup) })

  state.sessions = state.sessions ?? {}
  pruneSessions(state.sessions, now)
  const sessionKey = sessionKeyOf(body) ?? `${remoteJid}|${key.participant ?? ""}`
  const session = state.sessions[sessionKey]

  if (isGroup) {
    // Comandos de administração: ligam/desligam a demo num grupo sem editar o workflow
    state.demoGroups = state.demoGroups ?? []
    const command = text?.toLowerCase()
    if (command === "/repdrive-id") return [replyHere(`ID deste grupo: ${remoteJid}`)]
    if (command === "/repdrive-ativar") {
      if (!state.demoGroups.includes(remoteJid)) state.demoGroups.push(remoteJid)
      return [replyHere("✅ Demonstração do Repdrive ativada neste grupo. Mande qualquer mensagem para abrir o menu.")]
    }
    if (command === "/repdrive-desativar") {
      state.demoGroups = state.demoGroups.filter((g) => g !== remoteJid)
      return [replyHere("⏸️ Demonstração do Repdrive desativada neste grupo.")]
    }
    if (!config.demoGroupJids.includes(remoteJid) && !state.demoGroups.includes(remoteJid)) return []

    const first = msg.pushName?.trim().split(/\s+/)[0]
    if (!person?.phone) {
      // sem telefone do participante não dá para chamar no privado — a demo segue no próprio grupo
      return routeInChat(text, session, sessionKey, now, msg.pushName, state, replyHere)
    }

    const active = session?.privado && !session.ended && now - session.last <= SESSION_TIMEOUT_MS
    if (active) {
      return [replyHere(`${first ? `${first}, sua` : "Sua"} demonstração já está rolando no privado 👉 é só continuar por lá.`)]
    }

    state.sessions[sessionKey] = {
      persona: null,
      epoch: (session?.epoch ?? 0) + 1,
      last: now,
      privado: true,
      clientId: session?.clientId,
    }
    return [
      replyHere(`Oi${first ? `, ${first}` : ""}! 👋 Te chamei no privado — lá você testa à vontade e só você vê a sua conversa 🔒`),
      {
        action: "send",
        send: sendTo(person.phone, `${menuText(msg.pushName)}\n\n🔒 _Aqui no privado só você vê a conversa._`, false),
      },
    ]
  }

  // Privado: só atende quem começou a demo pelo grupo. O resto continua com o atendimento humano.
  if (!session?.privado || session.ended) return []

  if (now - session.last > SESSION_TIMEOUT_MS) {
    state.sessions[sessionKey] = { ...session, ended: true, persona: null }
    return [
      replyHere(
        `⏱️ Sua sessão de teste foi encerrada por inatividade. Para testar de novo, é só mandar uma mensagem no grupo *${DEMO_GROUP_NAME}*.`,
      ),
    ]
  }
  if (text && normalizeCommand(text) === "encerrar") {
    state.sessions[sessionKey] = { ...session, ended: true, persona: null }
    return [replyHere(`✅ Demonstração encerrada. Obrigado por testar o Repdrive! Para testar de novo, mande uma mensagem no grupo *${DEMO_GROUP_NAME}*.`)]
  }
  return routeInChat(text, session, sessionKey, now, msg.pushName, state, replyHere)
}

/** Menu / perfil / agente dentro da conversa atual (privado, ou grupo quando não há telefone). */
function routeInChat(
  text: string | undefined,
  session: DemoSession | undefined,
  sessionKey: string,
  now: number,
  pushName: string | undefined,
  state: EntradaState,
  replyHere: (reply: string) => EntradaOutput,
): EntradaOutput[] {
  if (!text) {
    return session?.persona ? [replyHere("Não consegui entender essa mensagem 🎧. Pode mandar o áudio de novo ou digitar a pergunta?")] : []
  }

  const route = routeDemoMessage({
    session,
    sessionKey,
    text,
    now,
    pushName,
    assignClient: () => {
      state.clientSeq = (state.clientSeq ?? 0) + 1
      return nextDemoClient(state.clientSeq - 1).clientId
    },
  })
  state.sessions![sessionKey] = route.session

  if (route.kind === "send") return [replyHere(route.text)]
  const out = replyHere("")
  return [
    {
      action: "agent",
      chatInput: text,
      systemPrompt: route.systemPrompt,
      memoryKey: route.memoryKey,
      persona: route.persona,
      clientId: route.clientId ?? "",
      send: out.send,
    },
  ]
}

/**
 * Chave da sessão do lead — a pessoa (telefone), igual no grupo e no privado. O workflow a usa
 * para ler/gravar a sessão no Redis, uma chave por lead, sem disputa entre execuções paralelas.
 */
export function sessionKeyOf(body: Record<string, unknown>): string | null {
  const raw = body.data as EvolutionMessage | EvolutionMessage[] | undefined
  const msg = Array.isArray(raw) ? raw[0] : raw
  const person = msg ? personOf(msg) : null
  return person ? `pessoa:${person.jid}` : null
}

/** Mensagem num chat privado de quem não está em demo? (o workflow não transcreve áudio dessas) */
export function isPrivate(body: Record<string, unknown>): boolean {
  const raw = body.data as EvolutionMessage | EvolutionMessage[] | undefined
  const msg = Array.isArray(raw) ? raw[0] : raw
  return !String(msg?.key?.remoteJid ?? "").endsWith("@g.us")
}

function pruneSessions(sessions: Record<string, DemoSession>, now: number): void {
  for (const [k, s] of Object.entries(sessions)) {
    if (now - s.last > SESSION_TTL_MS) delete sessions[k]
  }
}

export { finalizeReply }
