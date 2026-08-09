import type {
  ChecklistVeiculo,
  Cliente,
  HistoricoStatusSolicitacao,
  LocalizacaoMotorista,
  LogCombustivel,
  Motorista,
  PapelDeUsuario,
  PausaAlmoco,
  PrecoDeFrete,
  RegistroManutencao,
  Solicitacao,
  TipoDeMaterial,
  TrocaDeOleo,
  Usuario,
  Veiculo,
} from "@/types/entities"

/**
 * Bump ao mudar o formato de qualquer tabela — invalida o localStorage do visitante
 * e força uma nova semeadura, em vez de deixar o app quebrar com um formato antigo.
 */
export const SCHEMA_VERSION = 1
export const STORAGE_KEY = `alphadata:db:v${SCHEMA_VERSION}`

export interface DB {
  usuarios: Usuario[]
  papeis: PapelDeUsuario[]
  clientes: Cliente[]
  precos: PrecoDeFrete[]
  veiculos: Veiculo[]
  motoristas: Motorista[]
  tiposMaterial: TipoDeMaterial[]
  solicitacoes: Solicitacao[]
  historicoStatus: HistoricoStatusSolicitacao[]
  localizacoes: LocalizacaoMotorista[]
  combustivel: LogCombustivel[]
  oleo: TrocaDeOleo[]
  manutencao: RegistroManutencao[]
  checklists: ChecklistVeiculo[]
  pausasAlmoco: PausaAlmoco[]
  nextRequestNumber: number
}

export function emptyDB(): DB {
  return {
    usuarios: [],
    papeis: [],
    clientes: [],
    precos: [],
    veiculos: [],
    motoristas: [],
    tiposMaterial: [],
    solicitacoes: [],
    historicoStatus: [],
    localizacoes: [],
    combustivel: [],
    oleo: [],
    manutencao: [],
    checklists: [],
    pausasAlmoco: [],
    nextRequestNumber: 1000,
  }
}
