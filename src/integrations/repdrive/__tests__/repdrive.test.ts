import { describe, expect, it } from "vitest"
import { consultar } from "../entries/consulta"
import { handleWebhook, type EntradaState } from "../entries/entrada"
import { finalizeReply, routeDemoMessage, SESSION_TIMEOUT_MS } from "../demo/router"

const GROUP = "120363000000000000@g.us"
let msgId = 0

function webhook(text: string, opts: { from?: string; jid?: string; fromMe?: boolean; id?: string } = {}) {
  return {
    event: "messages.upsert",
    instance: "alphadata",
    server_url: "https://evo.example.com/",
    apikey: "KEY",
    data: {
      key: {
        remoteJid: opts.jid ?? GROUP,
        fromMe: opts.fromMe ?? false,
        id: opts.id ?? `MSG${msgId++}`,
        participant: opts.from ?? "5541900000001@s.whatsapp.net",
      },
      pushName: "Lead Teste",
      message: { conversation: text },
    },
  }
}

const config = { demoGroupJids: [GROUP] }

describe("Repdrive — escopo das ferramentas por persona", () => {
  it("cliente só enxerga as próprias cargas", () => {
    expect(consultar("cliente", "acompanhar_carga", { numero: 1014 })).toContain("Solicitação #1014")
    expect(consultar("cliente", "acompanhar_carga", { numero: 1013 })).toContain("Não encontrei a solicitação #1013")
  })

  it("motorista só enxerga as próprias corridas", () => {
    expect(consultar("motorista", "detalhe_carga", { numero: 1007 })).toContain("#1007")
    expect(consultar("motorista", "detalhe_carga", { numero: 1008 })).toContain("Não encontrei")
    const corridas = consultar("motorista", "minhas_corridas", {})
    expect(corridas).not.toContain("#1008")
    expect(corridas).toContain("google.com/maps")
  })

  it("bloqueia ferramentas fora do perfil", () => {
    expect(consultar("cliente", "painel_gestao", { topico: "resumo" })).toContain("não está disponível")
    expect(consultar("motorista", "tabela_frete", {})).toContain("não está disponível")
    expect(consultar("gestor", "minhas_corridas", {})).toContain("não está disponível")
    expect(consultar("intruso", "painel_gestao", {})).toContain("Perfil de acesso não identificado")
  })

  it("gestor reaproveita os indicadores do Assistente IA", () => {
    expect(consultar("gestor", "painel_gestao", { topico: "resumo" })).toContain("Panorama da operação")
    expect(consultar("gestor", "painel_gestao", { topico: "nao-existe" })).toContain("Tópico inválido")
    expect(consultar("gestor", "tabela_frete", { cliente: "mendes", tipo_veiculo: "utilitario" })).toContain("R$")
  })

  it("trata parâmetros vazios do modelo como ausentes", () => {
    expect(consultar("cliente", "minhas_solicitacoes", { escopo: "" })).toContain("#1014")
  })
})

describe("Repdrive — menu da demo", () => {
  const base = { sessionKey: "g|p", pushName: "Maria Souza" }

  it("sem perfil, qualquer texto mostra o menu", () => {
    const r = routeDemoMessage({ ...base, session: undefined, text: "oi", now: 0 })
    expect(r.kind).toBe("send")
    expect(r.kind === "send" && r.text).toContain("Olá, Maria")
    expect(r.session.persona).toBeNull()
  })

  it("1/2/3 escolhem o perfil e zeram a memória; 4 volta ao menu", () => {
    const s1 = routeDemoMessage({ ...base, session: undefined, text: "2", now: 0 }).session
    expect(s1.persona).toBe("motorista")
    const ask = routeDemoMessage({ ...base, session: s1, text: "minhas corridas", now: 1000 })
    expect(ask.kind).toBe("agent")
    expect(ask.kind === "agent" && ask.memoryKey).toBe(`g|p#${s1.epoch}`)
    const back = routeDemoMessage({ ...base, session: ask.session, text: "4", now: 2000 })
    expect(back.session.persona).toBeNull()
    expect(back.session.epoch).toBeGreaterThan(s1.epoch)
  })

  it("expira após 30 minutos parado", () => {
    const s = { persona: "cliente" as const, epoch: 1, last: 0 }
    const r = routeDemoMessage({ ...base, session: s, text: "e a carga?", now: SESSION_TIMEOUT_MS + 1 })
    expect(r.kind === "send" && r.text).toContain("expirou")
    expect(r.session.persona).toBeNull()
  })

  it("finalizeReply converte markdown para WhatsApp e põe o rodapé", () => {
    const out = finalizeReply("**Olá**\n- item\n### Título")
    expect(out).toContain("*Olá*\n• item\n*Título*")
    expect(out).toContain("Digite *4*")
    expect(finalizeReply(undefined)).toContain("Tive um problema")
  })
})

describe("Repdrive — webhook da Evolution", () => {
  it("ignora mensagens próprias, privadas, de outros grupos e duplicadas", () => {
    const state: EntradaState = {}
    expect(handleWebhook(webhook("oi", { fromMe: true }), state, config)).toBeNull()
    expect(handleWebhook(webhook("oi", { jid: "5541@s.whatsapp.net" }), state, config)).toBeNull()
    expect(handleWebhook(webhook("oi", { jid: "999@g.us" }), state, config)).toBeNull()
    expect(handleWebhook(webhook("oi", { id: "DUP" }), state, config)).not.toBeNull()
    expect(handleWebhook(webhook("oi", { id: "DUP" }), state, config)).toBeNull()
  })

  it("responde citando a mensagem do lead, pela URL da instância", () => {
    const out = handleWebhook(webhook("oi"), {}, config)
    expect(out?.send.url).toBe("https://evo.example.com/message/sendText/alphadata")
    expect(out?.send.body.number).toBe(GROUP)
    expect(out?.send.body.quoted?.key.participant).toBe("5541900000001@s.whatsapp.net")
  })

  it("mantém uma sessão por participante do grupo", () => {
    const state: EntradaState = {}
    handleWebhook(webhook("1", { from: "a@s.whatsapp.net" }), state, config)
    handleWebhook(webhook("3", { from: "b@s.whatsapp.net" }), state, config)
    const a = handleWebhook(webhook("como está a operação?", { from: "a@s.whatsapp.net" }), state, config)
    const b = handleWebhook(webhook("cadê minha carga?", { from: "b@s.whatsapp.net" }), state, config)
    expect(a?.action === "agent" && a.persona).toBe("gestor")
    expect(b?.action === "agent" && b.persona).toBe("cliente")
  })

  it("/repdrive-ativar liga a demo num grupo sem configuração", () => {
    const state: EntradaState = {}
    const empty = { demoGroupJids: [] }
    expect(handleWebhook(webhook("oi", { jid: "novo@g.us" }), state, empty)).toBeNull()
    expect(handleWebhook(webhook("/repdrive-ativar", { jid: "novo@g.us" }), state, empty)?.send.body.text).toContain("ativada")
    expect(handleWebhook(webhook("oi", { jid: "novo@g.us" }), state, empty)?.action).toBe("send")
    handleWebhook(webhook("/repdrive-desativar", { jid: "novo@g.us" }), state, empty)
    expect(handleWebhook(webhook("oi", { jid: "novo@g.us" }), state, empty)).toBeNull()
  })
})
