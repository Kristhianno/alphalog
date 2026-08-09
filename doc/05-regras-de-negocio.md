# 05. Regras de Negócio

Esta é a parte mais valiosa deste blueprint: são as decisões de comportamento que fazem o sistema funcionar corretamente na operação real, muitas vezes não óbvias só olhando as telas. Cada regra abaixo é implementável independentemente de nomes de tabela específicos (referência cruzada para [03-modelo-de-dados.md](03-modelo-de-dados.md) quando útil).

## 1. Ciclo de vida (state machine) do status da solicitação

Estados possíveis, na ordem típica do fluxo:

`agendada` → `solicitada` (também chamada de "enviada", sinônimo do mesmo estado) → `aceita` → `pendente_coleta` → `coletada` → `em_rota` → `pendente_entrega` → `entregue`

Mais o estado terminal alternativo `cancelada`, alcançável a partir de qualquer ponto do fluxo.

- **`agendada`**: a solicitação foi criada com uma data/hora futura de coleta e **ainda não é visível para motoristas**. Um processo automático (agendado, roda a cada minuto) verifica solicitações agendadas cuja data já chegou e as promove para `solicitada`.
- **`solicitada`/`enviada`**: "disponível" — visível para qualquer motorista habilitado no tipo de veículo exigido, ainda sem motorista atribuído.
- **`aceita`**: um motorista assumiu a corrida (campo de motorista preenchido); rastreamento de localização começa a valer.
- **`pendente_coleta` → `coletada`**: o motorista pode pular direto para `coletada` sem passar por `pendente_coleta` — os estados "pendente_*" são pontos intermediários opcionais, não obrigatórios.
- **`coletada` → `em_rota` → `pendente_entrega` → `entregue`**: mesma lógica — `pendente_entrega` é opcional, o motorista pode ir direto de `em_rota` para `entregue`.
- **`entregue`**: estado terminal de sucesso; ao ser alcançado, grava automaticamente o carimbo de data/hora de entrega.
- **`cancelada`**: estado terminal alternativo, sempre com motivo obrigatório (regra 4).

**Quem pode mudar o quê**: o motorista segue estritamente essa progressão (só avança, na ordem, podendo pular os pontos opcionais). A administração pode **forçar** a solicitação para qualquer status do fluxo a qualquer momento (exceto a partir de `entregue`, que é terminal), útil para correções manuais.

## 2. Exigência de evidência fotográfica na coleta

Ao marcar uma solicitação como `coletada`, o sistema **exige pelo menos um anexo** (foto) antes de permitir salvar a transição — é a prova de que a carga foi realmente retirada no endereço de origem. Se o motorista tentar confirmar sem anexo, o sistema recusa e força a abertura do seletor de arquivo/câmera.

## 3. Correspondência de tipo de veículo e aceite por concorrência

- Uma solicitação só aparece como "disponível" para motoristas cujo cadastro inclui o **mesmo tipo de veículo** exigido pela solicitação (um motorista pode estar habilitado em mais de um tipo).
- **Disponibilidade de um motorista não é um campo fixo**: é sempre **calculada em tempo real** como "indisponível" se ele já tiver qualquer entrega em um dos estados ativos (aceita, pendente_coleta, coletada, em_rota, pendente_entrega), e "disponível" caso contrário.
- **Aceite é resolvido por concorrência otimista**: quando um motorista toca em "aceitar", a atualização só é aplicada **se o status ainda estiver disponível** no exato momento da gravação (checagem condicional na escrita, não apenas na leitura da tela). Se outro motorista aceitou primeiro nesse intervalo, a operação falha e o app avisa "esta corrida já foi aceita por outro motorista" — evita que dois motoristas assumam a mesma corrida por causa de uma tela desatualizada.

## 4. Cancelamento (reversível) vs. exclusão (definitiva)

A administração tem duas ações distintas para tirar uma solicitação do fluxo normal, ambas exigindo que a pessoa **digite um motivo** antes de confirmar:
- **Cancelar**: muda o status para `cancelada`, mantém a linha e todo o histórico de status — recomendado como padrão, preserva rastreabilidade.
- **Excluir**: remove definitivamente a solicitação e seu histórico — reservado para casos de erro de cadastro (ex.: solicitação duplicada), não para cancelamento operacional comum.

Motoristas e clientes só têm acesso à ação de cancelar (com as restrições da regra 7), nunca à exclusão definitiva.

## 5. Precificação de frete por cliente, tipo de veículo e região

- O preço de referência de um frete é determinado por **cliente × tipo de veículo × região de precificação**, buscado numa tabela de preços mantida pela administração.
- **Detecção automática de região**: o endereço de origem e o de destino são analisados (comparados contra uma lista configurável de cidades/áreas por região); a região final escolhida é a **"mais cara" entre as duas pontas** (ex.: se a entrega sai da capital mas vai para uma região metropolitana mais distante, vale o preço da região metropolitana) — a lógica exata de prioridade entre regiões deve ser definida por `{{DOMINIO_GEOGRAFICO}}` na nova empresa.
- Se **qualquer uma das pontas** (origem ou destino) não puder ser identificada em nenhuma região conhecida, o preço não é determinável automaticamente e a tela mostra "a combinar" em vez de um valor.
- **Ajuste manual por solicitação** (`freight_override`) sempre tem prioridade sobre o valor calculado da tabela — usado quando a operação negocia um valor pontual diferente do padrão.

## 6. KM atual do veículo é sempre derivado, nunca editável diretamente

Não existe um campo de "hodômetro atual" editável livremente. O KM atual exibido para um veículo é sempre **o maior valor de KM já registrado** entre todos os seus registros de abastecimento, troca de óleo e manutenção. Isso evita divergência entre "o que o motorista disse que é o KM" em telas diferentes — há sempre uma única fonte de verdade (o registro mais recente/mais alto).

## 7. Alerta de troca de óleo vencida

No momento em que o **KM atual derivado** (regra 6) de um veículo alcança ou ultrapassa o `next_change_km` gravado no último registro de troca de óleo daquele veículo, a interface deve destacar visualmente um alerta (ex.: cor de urgência, ícone piscante) tanto para o motorista quanto para a administração — a intenção de produto é chamar atenção antes que a troca de óleo seja negligenciada.

## 8. Checklist veicular em dois grupos, com evidência

O checklist tem sempre **dois grupos de itens independentes**: um sobre materiais/itens de segurança obrigatórios a bordo (ex.: triângulo, macaco, documentos do veículo) e outro sobre condição mecânica/de segurança do próprio veículo (ex.: pneus, freios, luzes). Cada item é respondido individualmente como Sim/Não, com observação textual opcional, e cada grupo aceita anexos (fotos) como evidência complementar. Um checklist com muitos itens "Não" deve ser destacável na visão da administração (ex.: contagem de itens com problema), para priorizar acompanhamento.

## 9. Duração do almoço é calculada, não armazenada

O registro de pausa para almoço guarda apenas horário de saída e horário de retorno; a **duração é sempre calculada no momento da exibição** (diferença entre os dois horários), nunca persistida como um campo separado — evita inconsistência se algum dos horários for editado depois.

## 10. Auditoria automática de toda mudança de status

Toda vez que uma solicitação é criada ou tem seu status alterado, uma linha é **automaticamente** adicionada a um histórico de auditoria, registrando o novo status, quem fez a mudança e quando — isso não depende da tela que originou a mudança lembrar de gravar o histórico manualmente; é uma garantia de nível de dados (ex.: gatilho de banco), não de UI.

## 11. Rastreamento de localização é condicional, não contínuo

A localização do motorista só é **capturada e enviada** pelo app enquanto ele tem pelo menos uma entrega em estado ativo (aceita/pendente_coleta/coletada/em_rota/pendente_entrega) — evita gasto de bateria/dados desnecessário e uma pegada de privacidade menor quando o motorista não está em serviço. No lado de quem consome (cliente, administração), a leitura combina atualização em tempo real com uma repescagem periódica curta como reforço contra falha de conexão.

## 12. Regras de criação de conta e primeiro acesso

- **Bootstrap do primeiro admin**: a primeiríssima conta a logar no sistema (quando ainda não existe nenhum papel atribuído a ninguém) vira Admin automaticamente.
- **Todo autocadastro público nasce como Cliente** — não é possível se autopromover a motorista, gestor ou admin pela tela de registro; esses papéis só são atribuídos pela administração através da tela de Usuários.
- **Login por usuário** (não e-mail) é o mecanismo padrão para contas criadas pela administração; login por e-mail real só se aplica a contas nascidas do autocadastro (ver `02`).
