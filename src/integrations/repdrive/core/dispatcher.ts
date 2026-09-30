import type { Connector, RepdriveActor, ToolArgs } from "./types"

/**
 * Executa uma ferramenta do conector em nome do actor. A checagem de papel acontece aqui,
 * e cada ferramenta ainda filtra os dados pelo escopo do actor — duas camadas, de propósito.
 */
export function runTool<Ctx>(
  connector: Connector<Ctx>,
  toolName: string,
  args: ToolArgs,
  actor: RepdriveActor,
): string {
  const tool = connector.tools.find((t) => t.name === toolName)
  if (!tool) {
    return `Ferramenta "${toolName}" não existe. Use apenas as ferramentas disponíveis.`
  }
  if (!tool.roles.includes(actor.role)) {
    return "Essa consulta não está disponível para o seu perfil de acesso."
  }

  try {
    return tool.run(connector.load(actor), actor, cleanArgs(args))
  } catch (error) {
    return `Não consegui consultar agora (${error instanceof Error ? error.message : "erro inesperado"}).`
  }
}

/** O modelo às vezes manda "" ou "null" para parâmetros opcionais — trata tudo como ausente. */
function cleanArgs(args: ToolArgs): ToolArgs {
  const out: ToolArgs = {}
  for (const [key, value] of Object.entries(args ?? {})) {
    if (value === undefined || value === null) continue
    const text = String(value).trim()
    if (text === "" || text === "null" || text === "undefined") continue
    out[key] = value
  }
  return out
}
