import type { ToolArgs } from "../core/types"
import type { PersonaId } from "./personas"

/**
 * Modo sem IA: responde a demo só com regras + as mesmas ferramentas do agente, direto dos
 * dados do AlphaLog. Serve enquanto não há créditos de API — quando o modelo for ligado no
 * n8n, o agente de IA assume e este módulo vira só fallback.
 */

type Consultar = (persona: string, ferramenta: string, args: ToolArgs) => string

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

const has = (t: string, ...words: string[]) => words.some((w) => t.includes(w))

function requestNumber(t: string): number | undefined {
  const m = t.match(/\b(\d{4})\b/)
  return m ? Number(m[1]) : undefined
}

const GREETING = /^(oi+|ola|opa|bom dia|boa tarde|boa noite|e ai|eai|hey|hello)\b/
const THANKS = /^(obrigad[oa]|valeu|vlw|show|top|perfeito|otimo|blz|beleza|ok)\b/

const HELP: Record<PersonaId, string> = {
  gestor:
    "Posso te ajudar com a operação da AlphaLog. Experimente:\n• _Como está a operação agora?_\n• _Quanto faturamos nos últimos 30 dias?_\n• _Algum veículo precisa de troca de óleo?_\n• _Quais motoristas estão rodando?_\n• _Quanto cobramos da Mendes num utilitário?_\n• _Status da 1012_",
  motorista:
    "Posso te ajudar com suas corridas. Experimente:\n• _Quais são minhas entregas de hoje?_\n• _O que eu levo na carga 1007?_\n• _Minha CNH e meu veículo estão em dia?_\n• _Quantas entregas fiz no mês?_",
  cliente:
    "Posso te ajudar a acompanhar suas cargas. Experimente:\n• _Quais cargas minhas estão em andamento?_\n• _Quando chega a carga <número>?_\n• _Quais cargas já foram entregues?_",
}

const NOT_UNDERSTOOD = "Não entendi bem essa pergunta. 🤔"

function gestor(t: string, raw: string, consultar: Consultar): string {
  if (has(t, "preco", "cobra", "tabela", "valor do frete", "quanto custa", "quanto sai")) {
    const tipo = has(t, "caminhao grande", "carreta", "truck")
      ? "caminhao_grande"
      : has(t, "caminhao")
        ? "caminhao_medio"
        : has(t, "utilitario", "fiorino", "van")
          ? "utilitario"
          : has(t, "moto")
            ? "moto"
            : undefined
    const regiao = ["central", "norte", "sul"].find((r) => t.includes(`regiao ${r}`) || t.endsWith(r))
    const cliente = ["mendes", "construplus", "boa vista", "serra dourada", "monte verde", "rio bonito"].find((c) => t.includes(c))
    return consultar("gestor", "tabela_frete", { cliente, tipo_veiculo: tipo, regiao })
  }
  if (has(t, "como esta a operacao", "como ta a operacao", "operacao agora", "panorama", "resumo", "visao geral")) {
    return consultar("gestor", "painel_gestao", { topico: "resumo" })
  }
  if (has(t, "painel", "numeros", "indicadores")) return consultar("gestor", "painel_gestao", { topico: "painel" })
  if (has(t, "fatur", "receita") && has(t, "semana", "7 dias")) return consultar("gestor", "painel_gestao", { topico: "faturamento-semana" })
  if (has(t, "fatur", "receita", "ticket")) return consultar("gestor", "painel_gestao", { topico: "faturamento-mes" })
  if (has(t, "custo", "gasto", "gastamos", "consumo")) return consultar("gestor", "painel_gestao", { topico: "frota-custos" })

  const numero = requestNumber(t)
  const answer = consultar("gestor", "consulta_gestao", { texto: numero ? `#${numero}` : raw })
  return answer.startsWith("Ainda não sei responder") || answer.startsWith("Pode perguntar") ? `${NOT_UNDERSTOOD}\n\n${HELP.gestor}` : answer
}

function motorista(t: string, consultar: Consultar): string {
  const numero = requestNumber(t)
  if (numero) return consultar("motorista", "detalhe_carga", { numero })
  if (has(t, "cnh", "habilita", "document", "veiculo", "carro", "caminhao", "placa", "oleo", "checklist", "crlv", " km", "revisao", "manutencao")) {
    return consultar("motorista", "minha_documentacao", {})
  }
  if (has(t, "historico", "entreguei", "conclui", "fiz no mes", "ultimas entregas", "quantas entregas")) {
    return consultar("motorista", "minhas_corridas", { escopo: "historico" })
  }
  if (has(t, "hoje")) return consultar("motorista", "minhas_corridas", { escopo: "hoje" })
  if (has(t, "corrida", "rota", "entrega", "saida", "saio", "sair", "horario", "coleta", "carga", "proxim", "mapa", "endereco", "onde")) {
    return consultar("motorista", "minhas_corridas", { escopo: "ativas" })
  }
  return `${NOT_UNDERSTOOD}\n\n${HELP.motorista}`
}

function cliente(t: string, consultar: Consultar): string {
  const numero = requestNumber(t)
  if (numero) return consultar("cliente", "acompanhar_carga", { numero })
  if (has(t, "entregue", "historico", "anteriores", "ja chegaram", "concluid")) {
    return consultar("cliente", "minhas_solicitacoes", { escopo: "entregues" })
  }
  if (has(t, "todas", "todos")) return consultar("cliente", "minhas_solicitacoes", { escopo: "todas" })
  if (has(t, "carga", "pedido", "solicita", "andamento", "status", "chega", "coleta", "entrega", "frete", "motorista", "onde", "previsao")) {
    return consultar("cliente", "minhas_solicitacoes", { escopo: "ativas" })
  }
  return `${NOT_UNDERSTOOD}\n\n${HELP.cliente}`
}

function answerOne(persona: PersonaId, raw: string, consultar: Consultar): string {
  const t = normalize(raw)
  if (persona === "gestor") return gestor(t, raw, consultar)
  if (persona === "motorista") return motorista(t, consultar)
  return cliente(t, consultar)
}

export function answerWithoutAI(persona: PersonaId, text: string, consultar: Consultar): string {
  const t = normalize(text)
  if (THANKS.test(t) && t.length < 25) return "Por nada! Se quiser, é só perguntar mais alguma coisa. 😉"
  if (GREETING.test(t) && t.length < 25) return `Olá! 👋\n\n${HELP[persona]}`

  // "como está a operação? e quanto faturamos?" → responde cada pergunta em sequência
  const parts = text
    .split("?")
    .map((p) => p.replace(/^\s*(e|,)\s+/i, "").trim())
    .filter((p) => p.length > 2)
  const questions = parts.length > 1 ? parts.slice(0, 3) : [text]
  const answers = questions.map((q) => answerOne(persona, q, consultar))
  return [...new Set(answers)].join("\n\n———\n\n")
}
