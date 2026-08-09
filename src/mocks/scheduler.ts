import { getDB, saveDB } from "./db/store"
import { generateId } from "./db/ids"

/**
 * Promove `agendada` -> `solicitada` quando `scheduled_date` já chegou (regra 1). No
 * sistema de referência isso roda num cron de servidor a cada minuto; aqui, na ausência
 * de backend, rodamos por checagem no carregamento do app e a cada leitura de
 * solicitações — suficiente para o protótipo, com a mesma regra de negócio aplicada.
 */
export function runScheduler(): void {
  const db = getDB()
  const now = Date.now()
  let changed = false

  for (const solicitacao of db.solicitacoes) {
    if (
      solicitacao.status === "agendada" &&
      solicitacao.scheduled_date &&
      new Date(solicitacao.scheduled_date).getTime() <= now
    ) {
      solicitacao.status = "solicitada"
      solicitacao.updated_at = new Date().toISOString()
      db.historicoStatus.push({
        id: generateId("hist"),
        delivery_request_id: solicitacao.id,
        status: "solicitada",
        changed_by: "system",
        changed_by_name: "Agendador automático",
        changed_at: new Date().toISOString(),
        notes: "Promovida automaticamente: a data de coleta agendada foi atingida.",
        attachments: [],
      })
      changed = true
    }
  }

  if (changed) saveDB()
}
