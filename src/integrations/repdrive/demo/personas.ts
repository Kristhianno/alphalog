import { SEED_CLIENT_IDS } from "@/mocks/db/seed/clientes.seed"
import { SEED_DRIVER_IDS } from "@/mocks/db/seed/motoristas.seed"
import { SEED_USER_IDS } from "@/mocks/db/seed/usuarios.seed"
import type { RepdriveActor } from "../core/types"

export const DEMO_COMPANY_ID = "alphalog-demo"
export const DEMO_COMPANY_NAME = "AlphaLog Transportes"

export type PersonaId = "gestor" | "motorista" | "cliente"

export interface Persona {
  id: PersonaId
  option: string
  /** quem o lead "vira" na demo — fixo aqui, nunca escolhido pelo modelo */
  actor: RepdriveActor
  who: string
  tools: string[]
  intro: string
  focus: string
}

export const PERSONAS: Record<PersonaId, Persona> = {
  gestor: {
    id: "gestor",
    option: "1",
    actor: { companyId: DEMO_COMPANY_ID, userId: SEED_USER_IDS.gestor, role: "gestor" },
    who: "Carlos Eduardo Lima, gestor de operações da AlphaLog Transportes",
    tools: ["painel_gestao", "consulta_gestao", "tabela_frete"],
    focus:
      "operação em tempo real, solicitações paradas ou canceladas, faturamento, custos de frota (combustível, óleo, manutenção), motoristas (online, ranking, CNH) e tabela de fretes",
    intro: [
      "👔 *Modo Gestor ativado*",
      "Agora você é o *Carlos*, gestor de operações da AlphaLog Transportes. Pergunte como perguntaria no dia a dia, por exemplo:",
      "",
      "• _Como está a operação agora?_",
      "• _Quanto faturamos nos últimos 30 dias?_",
      "• _Algum veículo precisa de troca de óleo?_",
      "• _Quanto cobramos da Mendes num utilitário?_",
    ].join("\n"),
  },
  motorista: {
    id: "motorista",
    option: "2",
    actor: {
      companyId: DEMO_COMPANY_ID,
      userId: SEED_USER_IDS.motoristaJoao,
      role: "motorista",
      driverId: SEED_DRIVER_IDS.joao,
    },
    who: "João Pedro Nascimento, motorista fixo da AlphaLog Transportes",
    tools: ["minhas_corridas", "detalhe_carga", "minha_documentacao"],
    focus: "rota do dia, ordem das entregas, horário de saída, previsão de coleta e entrega, dados da carga e documentação (CNH, veículo, óleo, checklist)",
    intro: [
      "🚚 *Modo Motorista ativado*",
      "Agora você é o *João*, motorista da AlphaLog Transportes. Pergunte, por exemplo:",
      "",
      "• _Quais são minhas entregas de hoje e a que horas eu saio?_",
      "• _O que eu levo na carga 1007?_",
      "• _Minha CNH e meu veículo estão em dia?_",
    ].join("\n"),
  },
  cliente: {
    id: "cliente",
    option: "3",
    actor: {
      companyId: DEMO_COMPANY_ID,
      userId: SEED_USER_IDS.clienteRoberto,
      role: "cliente",
      clientId: SEED_CLIENT_IDS.mendes,
    },
    who: "Roberto Mendes, cliente da AlphaLog Transportes pela empresa Mendes Distribuidora Ltda",
    tools: ["minhas_solicitacoes", "acompanhar_carga"],
    focus: "status das próprias cargas, previsão de coleta e de entrega, quem é o motorista, onde está a carga e valor do frete",
    intro: [
      "📦 *Modo Cliente ativado*",
      "Agora você é o *Roberto*, da Mendes Distribuidora, cliente da AlphaLog Transportes. Pergunte, por exemplo:",
      "",
      "• _Quais cargas minhas estão em andamento?_",
      "• _Quando chega a carga 1014?_",
      "• _A carga 1002 já tem data de coleta?_",
      "",
      "🔒 Tente perguntar pela carga *1013* (de outro cliente) para ver que cada cliente só enxerga o que é dele.",
    ].join("\n"),
  },
}

export const MENU_FOOTER = "_Digite *4* para voltar ao menu_"

export function menuText(name?: string): string {
  const first = name?.trim().split(/\s+/)[0]
  return [
    `👋 Olá${first ? `, ${first}` : ""}! Eu sou o *Repdrive*, o agente de IA que atende a transportadora pelo WhatsApp — 24h, direto do sistema dela.`,
    "",
    "Escolha um perfil para ver na prática como eu atuo no dia a dia (dados fictícios):",
    "",
    "*1* 👔 *Gestor* — operação, dados, custos e fretes",
    "*2* 🚚 *Motorista* — rota, carga, horários e documentação",
    "*3* 📦 *Cliente* — status, coleta e entrega da carga",
    "*4* 🔄 Voltar a este menu (a qualquer momento)",
    "",
    "Responda só com o número.",
  ].join("\n")
}

export function personaByOption(option: string): Persona | undefined {
  return Object.values(PERSONAS).find((p) => p.option === option)
}

export function systemPrompt(persona: Persona, now = new Date()): string {
  const today = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "full",
    timeStyle: "short",
  }).format(now)

  return `Você é o Repdrive, agente de atendimento por WhatsApp da ${DEMO_COMPANY_NAME}, uma transportadora.
Agora: ${today} (horário de Brasília).

Você está conversando com ${persona.who}. Trate a pessoa por "você", como alguém da própria empresa falaria.
Assuntos deste perfil: ${persona.focus}.

REGRAS
1. Responda SOMENTE com dados obtidos pelas ferramentas ${persona.tools.join(", ")}. Nunca invente números, horários, nomes ou status. Chame a ferramenta antes de responder qualquer pergunta sobre dados.
2. Se a ferramenta disser que algo não foi encontrado ou não está disponível para o perfil, diga isso com naturalidade — não tente contornar.
3. Horários de coleta/entrega marcados como previsão são estimativas: deixe isso claro.
4. Formato WhatsApp: curto (idealmente até 12 linhas), *negrito* com um asterisco, _itálico_ com sublinhado, listas com •. Nada de títulos com #, tabelas ou **dois asteriscos**. Mantenha links do mapa inteiros.
5. Português do Brasil, tom cordial e objetivo. Emojis com moderação.
6. Fora do escopo (assuntos não relacionados à transportadora): explique em uma frase o que você consegue responder neste perfil.
7. Esta é uma demonstração com dados fictícios. Não mencione isso a cada mensagem; só se perguntarem.`
}
