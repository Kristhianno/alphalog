import "./polyfills"
import { runTool } from "../core/dispatcher"
import type { ToolArgs } from "../core/types"
import { alphaLogConnector } from "../connectors/alphalog/tools"
import { PERSONAS, type PersonaId } from "../demo/personas"
import { answerWithoutAI } from "../demo/ruleAgent"

/**
 * Lógica do nó "Consultar dados" (chamado pelas ferramentas do agente no n8n). O actor sai da
 * persona que o Roteador fixou para a sessão — o modelo só escolhe a ferramenta e os argumentos.
 */
export function consultar(persona: string, ferramenta: string, args: ToolArgs): string {
  const p = PERSONAS[persona as PersonaId]
  if (!p) return "Perfil de acesso não identificado."
  return runTool(alphaLogConnector, ferramenta, args, p.actor)
}

/** Definições das ferramentas — o script de build usa para gerar um nó de ferramenta por item. */
export const toolDefs = alphaLogConnector.tools.map(({ name, description, roles, params }) => ({
  name,
  description,
  roles,
  params,
}))

/** Modo sem IA: responde a pergunta do lead com regras + as mesmas ferramentas. */
export function responderSemIA(persona: string, texto: string): string {
  if (!PERSONAS[persona as PersonaId]) return "Perfil de acesso não identificado."
  return answerWithoutAI(persona as PersonaId, texto, consultar)
}
