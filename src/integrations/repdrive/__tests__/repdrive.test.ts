import { describe, expect, it } from "vitest"
import { consultar, responderSemIA } from "../entries/consulta"
import { audioOf, handleWebhook, withTranscription, type EntradaState } from "../entries/entrada"
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

describe("Repdrive — modo sem IA (regras + dados do AlphaLog)", () => {
  it("gestor: operação, frete, número de solicitação e várias perguntas numa mensagem", () => {
    const multi = responderSemIA("gestor", "como está a operação agora? e quanto faturamos no mês?")
    expect(multi).toContain("Panorama da operação")
    expect(multi).toContain("Faturamento nos últimos 30 dias")
    expect(responderSemIA("gestor", "quanto cobramos da Mendes num utilitário?")).toContain("Mendes Distribuidora")
    expect(responderSemIA("gestor", "status da 1012")).toContain("#1012")
  })

  it("motorista e cliente respeitam o escopo da persona", () => {
    expect(responderSemIA("motorista", "minha cnh está em dia?")).toContain("CNH")
    expect(responderSemIA("motorista", "o que levo na 1008?")).toContain("Não encontrei")
    expect(responderSemIA("cliente", "quando chega a carga 1014?")).toContain("Solicitação #1014")
    expect(responderSemIA("cliente", "e a 1013?")).toContain("Não encontrei")
  })

  it("pergunta desconhecida mostra exemplos do perfil", () => {
    expect(responderSemIA("cliente", "qual a capital da França?")).toContain("Experimente")
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

describe("Repdrive — grupo de demonstração → privado", () => {
  const lid = (phone: string) => `${phone.slice(-6)}0000@lid`
  const groupMsg = (text: string, phone: string, opts: { jid?: string; id?: string; fromMe?: boolean } = {}) => ({
    event: "messages.upsert",
    instance: "alphadata",
    server_url: "https://evo.example.com/",
    apikey: "KEY",
    data: {
      key: {
        remoteJid: opts.jid ?? GROUP,
        fromMe: opts.fromMe ?? false,
        id: opts.id ?? `G${msgId++}`,
        participant: lid(phone),
        participantAlt: `${phone}@s.whatsapp.net`,
      },
      pushName: "Maria Lead",
      message: { conversation: text },
    },
  })
  const privateMsg = (text: string, phone: string) => ({
    event: "messages.upsert",
    instance: "alphadata",
    server_url: "https://evo.example.com/",
    apikey: "KEY",
    data: {
      key: { remoteJid: `${phone}@s.whatsapp.net`, fromMe: false, id: `P${msgId++}` },
      pushName: "Maria Lead",
      message: { conversation: text },
    },
  })
  const t0 = 1_000_000

  it("mensagem no grupo responde no grupo e manda o menu no privado do lead", () => {
    const state: EntradaState = {}
    const out = handleWebhook(groupMsg("oi", "5541911110001"), state, config, t0)
    expect(out).toHaveLength(2)
    expect(out[0].send.body.number).toBe(GROUP)
    expect(out[0].send.body.text).toContain("Te chamei no privado")
    expect(out[0].send.body.quoted?.key.participant).toBe(lid("5541911110001"))
    expect(out[0].send.url).toBe("https://evo.example.com/message/sendText/alphadata")
    expect(out[1].send.body.number).toBe("5541911110001")
    expect(out[1].send.body.text).toContain("Escolha um perfil")
    expect(out[1].send.body.quoted).toBeUndefined()
  })

  it("no privado, só atende quem começou pelo grupo", () => {
    const state: EntradaState = {}
    expect(handleWebhook(privateMsg("oi", "5541911110002"), state, config, t0)).toEqual([])
    handleWebhook(groupMsg("oi", "5541911110002"), state, config, t0)
    const escolha = handleWebhook(privateMsg("2", "5541911110002"), state, config, t0 + 1000)
    expect(escolha[0].send.body.number).toBe("5541911110002@s.whatsapp.net")
    expect(escolha[0].send.body.text).toContain("Modo Motorista")
    const pergunta = handleWebhook(privateMsg("minhas corridas de hoje", "5541911110002"), state, config, t0 + 2000)
    expect(pergunta[0].action).toBe("agent")
  })

  it("lead que já está no privado não é reiniciado ao escrever no grupo", () => {
    const state: EntradaState = {}
    handleWebhook(groupMsg("oi", "5541911110003"), state, config, t0)
    handleWebhook(privateMsg("1", "5541911110003"), state, config, t0 + 1000)
    const out = handleWebhook(groupMsg("e aí?", "5541911110003"), state, config, t0 + 2000)
    expect(out).toHaveLength(1)
    expect(out[0].send.body.text).toContain("já está rolando no privado")
    expect(state.sessions?.["pessoa:5541911110003@s.whatsapp.net"]?.persona).toBe("gestor")
  })

  it("cada lead no perfil Cliente vira um cliente fictício diferente, com escopo próprio", () => {
    const state: EntradaState = {}
    const ids: string[] = []
    for (const phone of ["5541911110004", "5541911110005"]) {
      handleWebhook(groupMsg("oi", phone), state, config, t0)
      handleWebhook(privateMsg("3", phone), state, config, t0 + 1000)
      const ask = handleWebhook(privateMsg("minhas cargas", phone), state, config, t0 + 2000)[0]
      expect(ask.action).toBe("agent")
      if (ask.action === "agent") ids.push(ask.clientId)
    }
    expect(ids[0]).not.toBe(ids[1])
    expect(consultar("cliente", "minhas_solicitacoes", { escopo: "todas" }, ids[0])).not.toBe(
      consultar("cliente", "minhas_solicitacoes", { escopo: "todas" }, ids[1]),
    )
  })

  it("encerra por inatividade ou por 'encerrar' e devolve o privado ao atendimento humano", () => {
    const state: EntradaState = {}
    handleWebhook(groupMsg("oi", "5541911110006"), state, config, t0)
    handleWebhook(privateMsg("1", "5541911110006"), state, config, t0 + 1000)
    const expirou = handleWebhook(privateMsg("e o faturamento?", "5541911110006"), state, config, t0 + SESSION_TIMEOUT_MS + 5000)
    expect(expirou[0].send.body.text).toContain("encerrada por inatividade")
    expect(handleWebhook(privateMsg("oi", "5541911110006"), state, config, t0 + SESSION_TIMEOUT_MS + 6000)).toEqual([])

    handleWebhook(groupMsg("oi de novo", "5541911110006"), state, config, t0 + SESSION_TIMEOUT_MS + 7000)
    const fim = handleWebhook(privateMsg("encerrar", "5541911110006"), state, config, t0 + SESSION_TIMEOUT_MS + 8000)
    expect(fim[0].send.body.text).toContain("Demonstração encerrada")
    expect(handleWebhook(privateMsg("1", "5541911110006"), state, config, t0 + SESSION_TIMEOUT_MS + 9000)).toEqual([])
  })

  it("ignora mensagens próprias, de outros grupos e duplicadas", () => {
    const state: EntradaState = {}
    expect(handleWebhook(groupMsg("oi", "5541911110007", { fromMe: true }), state, config, t0)).toEqual([])
    expect(handleWebhook(groupMsg("oi", "5541911110007", { jid: "999@g.us" }), state, config, t0)).toEqual([])
    expect(handleWebhook(groupMsg("oi", "5541911110007", { id: "DUP" }), state, config, t0)).toHaveLength(2)
    expect(handleWebhook(groupMsg("oi", "5541911110007", { id: "DUP" }), state, config, t0)).toEqual([])
  })

  it("/repdrive-ativar liga a demo num grupo sem configuração", () => {
    const state: EntradaState = {}
    const empty = { demoGroupJids: [] }
    expect(handleWebhook(webhook("oi", { jid: "novo@g.us" }), state, empty)).toEqual([])
    expect(handleWebhook(webhook("/repdrive-ativar", { jid: "novo@g.us" }), state, empty)[0].send.body.text).toContain("ativada")
    expect(handleWebhook(webhook("oi", { jid: "novo@g.us" }), state, empty)).toHaveLength(2)
    handleWebhook(webhook("/repdrive-desativar", { jid: "novo@g.us" }), state, empty)
    expect(handleWebhook(webhook("oi", { jid: "novo@g.us" }), state, empty)).toEqual([])
  })

  it("áudio transcrito segue o fluxo como texto, inclusive opções faladas do menu", () => {
    const state: EntradaState = {}
    handleWebhook(groupMsg("oi", "5541911110008"), state, config, t0)
    const audio = (phone: string) => ({
      event: "messages.upsert",
      instance: "alphadata",
      data: {
        key: { remoteJid: `${phone}@s.whatsapp.net`, fromMe: false, id: `A${msgId++}` },
        message: { audioMessage: { mimetype: "audio/ogg; codecs=opus", seconds: 3 }, base64: "QUJD" },
      },
    })
    expect(audioOf(audio("5541911110008"))).toMatchObject({ mimetype: "audio/ogg", base64: "QUJD" })
    const escolha = handleWebhook(withTranscription(audio("5541911110008"), "Três."), state, config, t0 + 1000)
    expect(escolha[0].send.body.text).toContain("Modo Cliente ativado")
    const pergunta = handleWebhook(withTranscription(audio("5541911110008"), "Quando chega minha carga?"), state, config, t0 + 2000)
    expect(pergunta[0].action === "agent" && pergunta[0].chatInput).toBe("Quando chega minha carga?")
  })
})
