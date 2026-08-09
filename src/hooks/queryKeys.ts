/**
 * Fábrica central de chaves de query — única fonte de verdade tanto para `useQuery` quanto
 * para `invalidateQueries`, para a invalidação em cascata (doc/06) ficar explícita e num
 * único lugar em vez de espalhada por telas.
 */
export const qk = {
  solicitacoes: {
    all: ["solicitacoes"] as const,
    detail: (id: string) => ["solicitacoes", id] as const,
    historico: (id: string) => ["solicitacoes", id, "historico"] as const,
  },
  usuarios: { all: ["usuarios"] as const },
  motoristas: { all: ["motoristas"] as const },
  clientes: { all: ["clientes"] as const },
  veiculos: {
    all: ["veiculos"] as const,
    detail: (id: string) => ["veiculos", id] as const,
  },
  precos: { all: ["precos"] as const },
  materiais: { all: ["materiais"] as const },
  combustivel: { all: ["combustivel"] as const },
  oleo: { all: ["oleo"] as const },
  manutencao: { all: ["manutencao"] as const },
  checklists: { all: ["checklists"] as const },
  pausasAlmoco: { all: ["pausasAlmoco"] as const },
  localizacao: { detail: (driverId: string) => ["localizacao", driverId] as const },
}

/** Grupos de chaves afetados por qualquer mutação de solicitação (aceite/status/cancelar/excluir). */
export const SOLICITACAO_MUTATION_INVALIDATES = [qk.solicitacoes.all, qk.motoristas.all]

/** Grupos afetados por qualquer log de frota — KM derivado e alertas dependem de todos eles. */
export function fleetLogInvalidates(vehicleId: string) {
  return [qk.combustivel.all, qk.oleo.all, qk.manutencao.all, qk.veiculos.detail(vehicleId), qk.veiculos.all]
}
