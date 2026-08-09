# 03. Modelo de Dados

Este é um **modelo de referência**: os nomes de tabela e coluna abaixo podem ser adaptados livremente, mas a estrutura relacional, as regras de integridade e as regras de acesso descritas devem ser preservadas — foram desenhadas para resolver problemas reais de concorrência, auditoria e permissão que o sistema original enfrentou.

Convenções gerais válidas para (quase) toda tabela de domínio:
- Chave primária: identificador único gerado automaticamente (UUID).
- `created_at` / `updated_at`: carimbo de criação/última atualização.
- Toda tabela operacional tem uma política de acesso por linha (RLS) seguindo o padrão descrito em [02-papeis-e-permissoes.md](02-papeis-e-permissoes.md).

## Visão geral das entidades, por área

**Identidade e acesso**
- `usuarios` — perfil de cada pessoa com login no sistema.
- `papeis_de_usuario` — o papel (admin/gestor/assistente/motorista/cliente) de cada usuário.

**Comercial**
- `clientes` — empresas/pessoas que contratam frete.
- `precos_de_frete` — tabela de preços por cliente × tipo de veículo × região.

**Frota**
- `veiculos` — cada veículo (ou "modelo/tipo" de veículo, usado como referência de especificação).
- `motorista_tipo_veiculo` — quais tipos de veículo cada motorista está habilitado a dirigir.
- `logs_combustivel` — abastecimentos.
- `trocas_de_oleo` — registros de troca de óleo.
- `registros_manutencao` — manutenções preventivas/corretivas/preditivas.
- `checklists_veiculo` — vistorias periódicas do veículo.

**Operação (núcleo do sistema)**
- `motoristas` — cadastro de motoristas (fixos e agregados).
- `tipos_de_material` — categorias de carga transportada.
- `solicitacoes` — a entidade central: cada pedido de transporte.
- `historico_status_solicitacao` — trilha de auditoria de mudanças de status.
- `localizacao_motorista` — última posição GPS conhecida de cada motorista.

**Pessoas / apoio operacional**
- `pausas_almoco` — registro de horário de almoço do motorista.

**Suporte técnico**
- `historico_enderecos` — cache de endereços usados, para autocompletar formulários.
- `inscricoes_push` — inscrições de dispositivos para notificação (ver [07-mobile-app-e-notificacoes.md](07-mobile-app-e-notificacoes.md)).

## Detalhamento por tabela

### `usuarios`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| auth_id | uuid | vínculo com o registro de autenticação do backend |
| name | texto | |
| email | texto | e-mail real ou sintético (login por usuário) |
| phone | texto | opcional |
| avatar_url | texto | opcional |
| created_at / updated_at | timestamp | |

RLS: cada usuário vê apenas o próprio registro; administração vê todos; acesso anônimo negado.

### `papeis_de_usuario`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | referencia o usuário autenticado |
| role | enum | `admin` \| `gestor` \| `assistente_logistico` \| `motorista` \| `cliente` |
| created_at | timestamp | |

RLS: leitura do próprio papel liberada; escrita (atribuir/alterar papel) restrita à administração.

### `clientes`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| name, email, phone | texto | |
| document | texto | CPF/CNPJ ou equivalente local |
| address, city, state, zip_code | texto | |
| notes | texto | opcional |
| created_at / updated_at | timestamp | |

RLS: leitura ampla para qualquer usuário autenticado (necessário para telas de solicitação); escrita restrita à administração ou ao próprio cliente (vínculo por e-mail), conforme regra em `02`.

### `precos_de_frete`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| client_id | uuid → clientes | |
| transport_type | texto | tipo de veículo |
| region | texto | região de precificação |
| price | numérico | |
| created_at | timestamp | |
| — | — | único por (client_id, transport_type, region) |

RLS: administração gerencia tudo; cliente só lê os próprios preços.

### `veiculos`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| plate | texto | placa (pode ser um valor "modelo" quando a linha representa só um tipo de veículo de referência, não uma unidade física) |
| type | texto | categoria (ver lista sugerida em [08-guia-de-customizacao.md](08-guia-de-customizacao.md)) |
| brand, model, year | texto/inteiro | |
| capacity, length, width, height | numérico | especificações físicas, usadas em telas de ajuda ao cliente |
| document_number, document_attachment_path | texto | documento do veículo (equivalente a CRLV) |
| status | texto | `active` \| `maintenance` \| `inactive` |
| created_at / updated_at | timestamp | |

RLS: leitura ampla para autenticados; escrita restrita à administração.

### `motorista_tipo_veiculo`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| driver_id | uuid → motoristas (cascata ao excluir) | |
| vehicle_type | texto | |
| created_at | timestamp | |
| — | — | único por (driver_id, vehicle_type) |

### `motoristas`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | vínculo com conta de login (opcional — motorista pode existir sem portal ainda) |
| name, phone, email | texto | |
| license_number, cnh_category, cnh_valid_until | texto/data | habilitação para dirigir |
| cnh_attachment_path | texto | anexo da habilitação |
| is_fixed | booleano | `true` = funcionário fixo, `false` = agregado |
| vehicle_id | uuid → veiculos | veículo principal vinculado |
| status | texto | informativo; a disponibilidade real é **calculada** (ver regra 3 em `05`) |
| created_at / updated_at | timestamp | |

### `tipos_de_material`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| name, description | texto | |
| requires_special_handling | booleano | sinaliza carga que exige cuidado especial (frágil, perecível, etc.) |
| created_at | timestamp | |

### `solicitacoes` (entidade central)
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| request_number | sequencial | número exibido ao usuário (ex.: #000123) |
| client_id | uuid → clientes | |
| driver_id | uuid → motoristas | nulo até ser aceita |
| vehicle_id | uuid → veiculos | |
| material_type_id | uuid → tipos_de_material | |
| origin_address, origin_company | texto | |
| destination_address, destination_company | texto | |
| region | texto | região de precificação detectada automaticamente |
| transport_type | texto | tipo de veículo exigido |
| status | texto (enum de fato) | ver lista completa em `05-regras-de-negocio.md` |
| scheduled_date | timestamp | usado quando a solicitação é agendada para o futuro |
| delivered_at | timestamp | preenchido quando o status vira "entregue" |
| notes | texto | observações gerais (também usada para registrar motivo de cancelamento) |
| requester, requester_phone | texto | quem solicitou no lado do cliente |
| invoice_number, op_number | texto | referências administrativas do cliente (nota fiscal, ordem de produção/pedido) |
| payment_method | texto | pix / cartão / boleto / dinheiro / nulo |
| freight_override | numérico | valor manual que substitui o preço da tabela quando preenchido |
| attachments | lista de caminhos de arquivo | evidências gerais da solicitação |
| created_at / updated_at | timestamp | |

RLS: cliente restrito às próprias solicitações; motorista lê solicitações "disponíveis" compatíveis com seu tipo de veículo + as já atribuídas a ele, e só pode "aceitar" uma disponível (não pode assumir uma já aceita por outro); administração tem acesso total.

### `historico_status_solicitacao`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| delivery_request_id | uuid → solicitacoes (cascata) | |
| status | texto | valor do status naquele momento |
| changed_by | uuid | usuário autenticado que fez a mudança |
| changed_at | timestamp | |
| notes | texto | opcional |
| attachments | lista de caminhos de arquivo | evidência daquela etapa (ex.: foto da coleta) |

Preenchida **automaticamente** a cada criação/mudança de status de uma solicitação (ver regra 10 em `05`) — não é uma tabela editada diretamente pela UI a não ser para anexar evidência/observação à etapa já registrada.

### `localizacao_motorista`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| driver_id | uuid → motoristas (único — uma linha por motorista, sempre sobrescrita) | |
| delivery_request_id | uuid → solicitacoes, opcional | contexto da corrida atual |
| latitude, longitude | numérico | |
| heading, speed | numérico | opcional, para exibir direção/velocidade no mapa |
| updated_at | timestamp | |

### `logs_combustivel`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| vehicle_id, driver_id | uuid | |
| log_date | data | |
| km_initial, km_final | numérico | |
| km_total | numérico (**calculado** = km_final − km_initial) | |
| liters, fuel_price, total_cost | numérico | |
| fuel_type | texto | gasolina / álcool / diesel / gnv (ajustar por região/frota) |
| vehicle_plate | texto | cópia da placa no momento do registro (mantém histórico legível mesmo se a placa mudar depois) |
| notes | texto | |
| created_at / updated_at | timestamp | |

### `trocas_de_oleo`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| vehicle_id, driver_id | uuid | |
| change_date | data | |
| km_at_change | numérico | |
| next_change_km | numérico | usado no alerta de troca vencida (regra 6/7 em `05`) |
| oil_type | texto | |
| service_cost | numérico | |
| vehicle_plate | texto | cópia no momento do registro |
| notes | texto | |
| created_at | timestamp | |

### `registros_manutencao`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| vehicle_id, driver_id | uuid | |
| maintenance_type | texto | preventiva / corretiva / preditiva |
| vehicle_plate | texto | cópia no momento do registro |
| current_km | numérico | |
| service_cost | numérico | |
| notes | texto | |
| maintenance_date | data | |
| created_at / updated_at | timestamp | |

### `checklists_veiculo`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| vehicle_id, driver_id | uuid | |
| vehicle_plate | texto | |
| checklist_date | data | |
| current_km | numérico | |
| materiais | estrutura (lista) | lista de itens do grupo "materiais", cada um com identificador, rótulo, status (sim/não/vazio) e observação — ver itens sugeridos em `08` |
| materiais_observacoes | texto | |
| materiais_attachments | lista de caminhos de arquivo | |
| veiculo | estrutura (lista) | mesma estrutura, para o grupo "condição do veículo" |
| veiculo_observacoes | texto | |
| veiculo_attachments | lista de caminhos de arquivo | |
| created_at / updated_at | timestamp | |

Nota de design: guardar **rótulo do item junto com o identificador** (não só o identificador) preserva o texto histórico exibido mesmo que a lista de itens do checklist mude no futuro — evita que um checklist antigo "perca o significado" quando um item é renomeado ou removido.

### `pausas_almoco`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| driver_id | uuid → motoristas | |
| employee_name | texto | cópia do nome no momento do registro |
| break_date | data | padrão: hoje |
| exit_time, return_time | hora | duração é **calculada** na exibição, nunca armazenada (regra 9 em `05`) |
| observacoes | texto | opcional |
| attachments | lista de caminhos de arquivo | comprovante (recibo/nota) |
| valor | numérico | valor de reembolso, se aplicável |
| created_at / updated_at | timestamp | |

### `historico_enderecos`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| address | texto | |
| used_count | inteiro | incrementado a cada uso, alimenta o ranking do autocompletar |
| last_used_at | timestamp | |
| created_at | timestamp | |
| — | — | índice único por endereço normalizado (minúsculas) |

RLS: leitura/escrita liberada para qualquer usuário autenticado — é um cache compartilhado, sem dono.

### `inscricoes_push`
Ver estrutura recomendada em [07-mobile-app-e-notificacoes.md](07-mobile-app-e-notificacoes.md) — a tabela de tokens de notificação deve ficar vinculada ao usuário/motorista, com índice único por (usuário, token de dispositivo).

## Enums e "enums de fato" (valores fechados por regra, não por tipo de coluna)

| Campo | Valores | Significado |
|---|---|---|
| `papeis_de_usuario.role` | admin, gestor, assistente_logistico, motorista, cliente | papel do usuário |
| `solicitacoes.status` | agendada, solicitada/enviada, aceita, pendente_coleta, coletada, em_rota, pendente_entrega, entregue, cancelada | ciclo de vida da entrega — ver detalhamento em `05` |
| `solicitacoes.payment_method` | pix, cartao, boleto, dinheiro, (vazio) | forma de pagamento combinada com o cliente |
| `logs_combustivel.fuel_type` | gasolina, alcool, diesel, gnv | tipo de combustível (ajustar lista por realidade da frota) |
| `registros_manutencao.maintenance_type` | preventiva, corretiva, preditiva | natureza da manutenção |
| `veiculos.status` | active, maintenance, inactive | situação operacional do veículo |
| item de checklist (`status` dentro do jsonb) | sim, nao, (vazio) | resposta do item de vistoria |

## Armazenamento de arquivos (buckets privados)

Todo anexo (foto, documento, comprovante) fica em armazenamento **privado**, nunca público, organizado por convenção de pasta que amarra o arquivo à entidade dona:

| Área | Convenção de pasta sugerida | Quem acessa |
|---|---|---|
| Anexos de solicitação | `{id_da_solicitacao}/arquivo.ext` | cliente dono, motorista atribuído, administração |
| Documentos de motorista/veículo (CNH, documento do veículo) | `motorista-docs/{id}/...`, `veiculo-docs/{id}/...` | administração (leitura/escrita), demais (leitura conforme papel) |
| Anexos de checklist veicular | `checklist-materiais/{id_motorista}/...`, `checklist-veiculo/{id_motorista}/...` | motorista dono, administração |
| Comprovante de almoço | `almoco/{id_motorista}/...` | motorista dono, administração |

Acesso a qualquer arquivo é sempre resolvido por **URL assinada de curta duração** gerada sob demanda (ex.: válida por 1 hora), nunca por link público fixo — isso garante que a regra de RLS da tabela "dona" do registro continue sendo o único ponto de controle de acesso.
