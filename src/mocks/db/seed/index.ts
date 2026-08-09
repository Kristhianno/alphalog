import type { DB } from "../schema"
import { seedUsuarios } from "./usuarios.seed"
import { seedClientes } from "./clientes.seed"
import { seedTiposDeMaterial } from "./materiais.seed"
import { seedVeiculos } from "./veiculos.seed"
import { seedMotoristas } from "./motoristas.seed"
import { seedPrecosDeFrete } from "./precos.seed"
import { seedSolicitacoes } from "./solicitacoes.seed"
import { seedLogsCombustivel } from "./combustivel.seed"
import { seedTrocasDeOleo } from "./oleo.seed"
import { seedRegistrosManutencao } from "./manutencao.seed"
import { seedChecklists } from "./checklists.seed"
import { seedPausasAlmoco } from "./pausasAlmoco.seed"
import { seedLocalizacaoMotorista } from "./localizacao.seed"

export function buildSeedDatabase(): DB {
  const { usuarios, papeis } = seedUsuarios()
  const { solicitacoes, historico, nextRequestNumber } = seedSolicitacoes()

  return {
    usuarios,
    papeis,
    clientes: seedClientes(),
    precos: seedPrecosDeFrete(),
    veiculos: seedVeiculos(),
    motoristas: seedMotoristas(),
    tiposMaterial: seedTiposDeMaterial(),
    solicitacoes,
    historicoStatus: historico,
    localizacoes: seedLocalizacaoMotorista(),
    combustivel: seedLogsCombustivel(),
    oleo: seedTrocasDeOleo(),
    manutencao: seedRegistrosManutencao(),
    checklists: seedChecklists(),
    pausasAlmoco: seedPausasAlmoco(),
    nextRequestNumber,
  }
}

export { SEED_USER_IDS } from "./usuarios.seed"
export { SEED_CLIENT_IDS, CLIENT_USER_LINKS } from "./clientes.seed"
export { SEED_MATERIAL_IDS } from "./materiais.seed"
export { SEED_VEHICLE_IDS, VEHICLE_TYPE_SPECS } from "./veiculos.seed"
export { SEED_DRIVER_IDS } from "./motoristas.seed"
