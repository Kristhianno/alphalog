import { SEED_CLIENT_IDS } from "@/mocks/db/seed/clientes.seed"
import { buildSeedDatabase } from "@/mocks/db/seed"
import { isActiveStatus } from "@/domain/requestStatus"

/**
 * Clientes fictícios distribuídos entre os leads que escolhem "Cliente" — cada lead vira uma
 * empresa diferente, com as próprias cargas. Contatos = solicitantes que já aparecem no seed.
 */
export interface DemoClient {
  clientId: string
  contact: string
  company: string
}

export const DEMO_CLIENTS: DemoClient[] = [
  { clientId: SEED_CLIENT_IDS.mendes, contact: "Roberto", company: "Mendes Distribuidora" },
  { clientId: SEED_CLIENT_IDS.construplus, contact: "Juliana", company: "Construplus Materiais de Construção" },
  { clientId: SEED_CLIENT_IDS.serraDourada, contact: "Patrícia", company: "Indústria Serra Dourada Metais" },
  { clientId: SEED_CLIENT_IDS.monteVerde, contact: "Eduardo", company: "Farmacêutica Monte Verde" },
  { clientId: SEED_CLIENT_IDS.boaVista, contact: "Simone", company: "Comercial Boa Vista Alimentos" },
  { clientId: SEED_CLIENT_IDS.rioBonito, contact: "Marcelo", company: "Auto Peças Rio Bonito" },
]

export function demoClient(clientId: string | undefined): DemoClient {
  return DEMO_CLIENTS.find((c) => c.clientId === clientId) ?? DEMO_CLIENTS[0]
}

/** Próximo cliente da fila (round-robin pelo contador guardado pelo workflow). */
export function nextDemoClient(seq: number): DemoClient {
  return DEMO_CLIENTS[((seq % DEMO_CLIENTS.length) + DEMO_CLIENTS.length) % DEMO_CLIENTS.length]
}

/** Números de carga para os exemplos da apresentação: uma do próprio cliente e uma de outro. */
export function clientExamples(clientId: string): { own?: number; scheduled?: number; other?: number } {
  const db = buildSeedDatabase()
  const own = db.solicitacoes.filter((r) => r.client_id === clientId)
  const byNumber = (a: { request_number: number }, b: { request_number: number }) => b.request_number - a.request_number
  return {
    own: own.filter((r) => isActiveStatus(r.status)).sort(byNumber)[0]?.request_number,
    scheduled: own.filter((r) => r.status === "agendada" || r.status === "solicitada").sort(byNumber)[0]?.request_number,
    other: db.solicitacoes.filter((r) => r.client_id !== clientId && isActiveStatus(r.status)).sort(byNumber)[0]
      ?.request_number,
  }
}
