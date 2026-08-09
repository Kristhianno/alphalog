# 04. Telas e Fluxos

9 telas cobrem todo o sistema. Layout geral (exceto autenticação): barra lateral colapsável (vira menu tipo gaveta no celular) com navegação filtrada por papel, cabeçalho com título/subtítulo contextual por papel, rodapé com usuário logado e botão de sair. Toda listagem tem versão em tabela (desktop) e versão em cartões (mobile). Um aviso fixo aparece quando o dispositivo está offline.

## 1. Login / Registro (rota pública, tela inicial)

- Painel dividido: lado com identidade visual/benefícios do produto + lado com formulário, alternando entre **Entrar** e **Criar conta**.
- **Entrar**: usuário (não e-mail) + senha. Autentica contra a conta interna (ver `02`). Link "Esqueceu sua senha?" pede e-mail real e dispara fluxo de redefinição por e-mail (só funciona para contas autocadastradas).
- **Criar conta**: nome, e-mail, senha (mínimo de caracteres). Sempre cria conta como Cliente (exceto a primeiríssima conta do sistema, que vira Admin — regra de bootstrap em `02`).
- Se já autenticado, redireciona automaticamente para o Painel.
- Depois de alguns segundos, pode exibir um convite para instalar o app como PWA (dispensável, lembrado depois via preferência local do navegador).

## 2. Instalação do app (PWA)

- Tela explicativa com benefícios (acesso rápido, uso offline parcial, mais parecido com app nativo) e botão de instalação quando o navegador suporta instalação em um clique; em iOS mostra passo a passo manual ("adicionar à tela de início"), já que o iOS não oferece instalação automática pelo navegador.
- Detecta e avisa quando o app já está rodando em modo instalado.

## 3. Redefinição de senha (a partir do link de e-mail)

- Aguarda a sessão de recuperação vinda do link do e-mail (com tempo limite curto); se expirar, avisa que o link é inválido/expirado e manda de volta para o login.
- Formulário: nova senha + confirmação, com validação de tamanho mínimo/máximo e de que as duas senhas coincidem.

## 4. Painel (Dashboard) — rota inicial após login, todos os papéis

A tela mais densa do sistema; conteúdo muda conforme o papel:

- **Cliente**: título "Minhas Solicitações", lista só as próprias.
- **Motorista**: título "Minhas Entregas", lista só as próprias em andamento/concluídas (não a fila de disponíveis — essa fica na tela de Motoristas).
- **Gestor/Assistente**: título "Painel do Gestor", visão completa.
- **Admin**: título "Painel do Administrador", visão completa.

Elementos:
- **Cartões de indicador**: Total, Hoje (com variação percentual vs. ontem), Em Andamento (soma de todos os status intermediários), Entregues e — só para papéis de administração — Total de Frete (soma dos valores de frete do período filtrado).
- **Filtros**: busca livre, status, período de datas e — só para administração — tipo de transporte. Para papéis de administração, o filtro escolhido fica **lembrado por usuário** entre sessões.
- **Lista/tabela** com colunas: número da solicitação, cliente, motorista (ou "solicitante" para o próprio cliente), material, tipo de transporte, empresa de coleta, empresa de entrega, status, data e — só administração — valor de frete, além de ações.
- **Edição rápida em linha** (só administração): trocar o motorista atribuído e ajustar o valor do frete diretamente na lista, sem abrir modal.
- **Ações por linha**: ver detalhes (abre o diálogo unificado de detalhes, item 4a abaixo), editar, cancelar/excluir.
  - Cliente só pode editar/cancelar enquanto o status ainda é o inicial (regra 7 em `05`); fora disso os botões ficam desabilitados com uma explicação.
  - Administração tem duas opções destrutivas distintas: **cancelar** (mantém o registro e o histórico, mas marca como cancelado) e **excluir** (remove definitivamente, inclusive o histórico) — ambas exigem digitar um motivo antes de confirmar (regra 4 em `05`).
- **Exportar PDF** (só administração, com resultados filtrados): gera relatório com resumo por status + total de frete, seguido de tabela detalhada.

### 4a. Diálogo unificado de detalhes da solicitação
Reaproveitado a partir de várias telas (Painel, Solicitações, listagem do motorista). Mostra:
- Dados do cliente, material, tipo de transporte, valor de frete e forma de pagamento (edição de frete/pagamento só para administração).
- Solicitante, data/agendamento, referências administrativas do cliente (nota fiscal, número de pedido/ordem).
- Cartões de endereço de origem/destino, com botão para abrir rota num app de mapas externo e uma estimativa de distância entre os pontos.
- Campo de observações (editável pela administração, somente leitura para motorista).
- Anexos gerais da solicitação (adicionar: administração; ver: todos com acesso; remover: administração).
- **Linha do tempo completa do status** (todas as etapas do ciclo de vida — ver `05`), cada etapa já concluída pode ser expandida para ver nota/anexo/data daquele momento; administração pode editar retroativamente essas notas/anexos.
- Ações de transição de status disponíveis conforme o papel e o status atual (ver regras 1 e 2 em `05`).

## 5. Solicitações (rota para administração e cliente; motorista tem sua própria fila na tela de Motoristas)

- Composição: formulário de nova solicitação no topo + barra de busca/filtro + lista de solicitações.
- Subtítulo muda: "Crie e acompanhe suas solicitações" (cliente) vs. "Gerencie as solicitações" (administração).
- Mesma exportação em PDF disponível aqui (administração).

### 5a. Formulário de nova solicitação
Campos obrigatórios: nome/telefone do solicitante, endereço de origem e destino (com badge de região detectada automaticamente ao lado de cada endereço), tipo de material, tipo de transporte. Campos opcionais: nota fiscal, número de pedido/ordem, observações, anexos. Sub-formulário opcional "Agendar coleta" define uma data/hora futura, o que faz a solicitação nascer com status "agendada" em vez do status padrão "solicitada". O número sequencial da próxima solicitação é mostrado como prévia antes mesmo de salvar. Rascunho do formulário é salvo localmente no dispositivo enquanto o usuário digita, para não perder preenchimento em caso de fechamento acidental do app.

## 6. Usuários (rota exclusiva de administração — admin/gestor/assistente)

- Se um papel sem permissão tentar acessar diretamente, mostra tela de "acesso restrito" (camada extra de proteção além do bloqueio de rota).
- Cartões de contagem por papel (administradores, gestores, motoristas, clientes).
- Busca (nome/telefone/e-mail) + filtro por papel.
- Lista com: iniciais/avatar colorido por papel, nome + identificação de login (usuário interno ou e-mail real), telefone, papel, tipos de veículo habilitados (só linhas de motorista), data de cadastro, e menu de ações: Editar, Redefinir Senha, Excluir (oculto para o próprio usuário logado, e — dependendo da política da nova empresa — reservado só a Admin).
- **Criar/editar usuário**: nome, nome de usuário (login), telefone, senha (só na criação — edição usa diálogo separado de redefinição), papel, e — só quando o papel é motorista — seleção múltipla dos tipos de veículo que ele pode dirigir, cada um com um resumo de especificações (dimensões/capacidade) num popover de ajuda. A seleção de tipos de veículo é limpa automaticamente se o papel for trocado para algo diferente de motorista.
- **Redefinir senha**: diálogo dedicado, exige senha nova com tamanho mínimo.
- **Excluir**: confirmação obrigatória antes de remover a conta.

## 7. Motoristas — tela com visão totalmente diferente por papel

### Visão do motorista ("Minhas Corridas")
- Cartões: quantidade de solicitações disponíveis para seu(s) tipo(s) de veículo, tipos de veículo habilitados, veículo(s) vinculado(s).
- Tabela/lista da fila: mistura solicitações **disponíveis** (compatíveis com seu tipo de veículo, ainda sem motorista) com as que **já são dele** em andamento — com busca e filtro de status.
- Seção de **registro de almoço**: formulário (data, hora de saída, hora de retorno, valor, observações, comprovante) + histórico pessoal com duração calculada automaticamente a partir dos horários.
- Se o usuário motorista ainda não tem um cadastro de motorista vinculado (caso administrativo pendente), mostra aviso para contatar a administração em vez da tela normal.

### Visão da administração ("Gestão de Motoristas")
- Cartões: total de motoristas, entregas concluídas, corridas ativas no momento.
- Tabela de motoristas com contadores por motorista (total/concluídas/ativas), indicador **online/offline** (calculado: "online" significa ter pelo menos uma entrega ativa no momento, não presença literal no app), botão de **rastrear** (habilitado só quando o motorista tem entrega ativa — abre mapa ao vivo) e acesso à documentação do motorista (habilitação + documento do veículo vinculado, com upload/preview/exclusão de anexo, edição restrita à administração).
- Abaixo da tabela: histórico de almoço de **toda a frota**, com visualização e exclusão de registros.

### 7a. Diálogo de rastreamento ao vivo
Mapa mostrando a posição atual do motorista (atualizada em tempo real + repescagem periódica curta como reforço), velocidade convertida para km/h, status da entrega em andamento, e marcação dos pontos de origem/destino da entrega associada.

## 8. Veículos — tela com visão totalmente diferente por papel

### Visão do motorista (registro operacional do próprio veículo)
- Cartões: KM atual (calculado — ver regra 6 em `05`), litros abastecidos no período, gasto total, próxima troca de óleo — com **aviso visual de destaque** quando o KM atual já alcançou/ultrapassou o KM programado da próxima troca.
- Filtros por tipo de veículo, placa e período.
- Quatro ações de registro, cada uma com formulário próprio:
  - **Abastecimento**: veículo/placa, data, KM atual, tipo de combustível, litros, preço por litro (custo total calculado automaticamente), observações, anexos.
  - **Troca de óleo**: veículo/placa, data, KM na troca, KM da próxima troca, tipo de óleo, custo do serviço, observações, anexos.
  - **Manutenção**: tipo (preventiva/corretiva/preditiva), veículo/placa, data, KM atual, custo do serviço, observações, anexos.
  - **Checklist veicular**: formulário em duas abas — "Materiais" e "Veículo" — cada uma com uma lista fixa de itens (ver lista sugerida em `08`), cada item respondido como Sim/Não + observação opcional, mais um campo de observações geral e anexos por aba.
- Todo registro criado pode ser editado (incluindo adicionar/remover anexos) e excluído (com confirmação) pelo próprio motorista dono do registro.

### Visão da administração (painel analítico da frota)
- Filtros: tipo de veículo, placa, tipo de combustível, período.
- Cartões: número de veículos, litros totais, gasto total, **consumo médio (km por litro)** calculado por veículo e somado, e quantidade de alertas de troca de óleo vencida.
- Gráfico de custo por veículo, empilhado por categoria (combustível / troca de óleo / manutenção).
- Gráfico de valor total de frete gerado por veículo/placa (cruzando solicitações entregues com a tabela de preços, respeitando ajuste manual de frete quando existir).
- Gráfico de volume de solicitações por tipo de veículo ao longo do tempo.
- Tabela de indicadores por veículo + históricos (abastecimento/óleo/manutenção/checklist) exibidos tanto em grades na própria página quanto num diálogo de detalhe por veículo com abas.
- Exportação em PDF por veículo ou da frota inteira.

## 9. Página não encontrada (404)
Tela simples com link de volta para o início; qualquer rota não mapeada cai aqui.

## Observações para a reimplementação

- **Evitar ambiguidade de componentes duplicados**: no sistema original, algumas telas acumularam mais de uma implementação para a mesma função ao longo do tempo (ex.: uma versão simplificada de painel de veículos que ficou sem uso depois que a versão completa foi criada, e um diálogo antigo de aceitar corrida substituído por um diálogo unificado de detalhes). Ao reimplementar do zero, **construa uma única versão definitiva de cada tela/diálogo** em vez de deixar versões antigas no código.
- **Diálogos de fluxo crítico não devem fechar por acidente**: diálogos que envolvem preencher informação sensível durante uma operação (ex.: detalhes/atualização de status de uma entrega) devem exigir fechamento explícito (botão "X" ou "Cancelar"), não fechar ao clicar fora ou apertar Esc — evita perda de dados em preenchimento no celular.
