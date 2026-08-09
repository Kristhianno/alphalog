# 08. Guia de Customização para uma Nova Empresa

Leia este arquivo **antes de começar a implementar**. Ele lista o que precisa ser decidido/trocado para adaptar o blueprint (arquivos `01` a `07`) à realidade de `{{EMPRESA}}`, e alerta sobre pontos do sistema original que não devem ser copiados literalmente.

## 1. Identidade

| Item | Definir |
|---|---|
| Nome comercial do app | `{{EMPRESA}}` |
| Identificador do app nas lojas | `{{APP_ID}}` (ex.: `br.com.novaempresa.app`) |
| Domínio interno para login por usuário | `{{DOMINIO_INTERNO}}` (não precisa ser um domínio real, só precisa ser único e não colidir com e-mails reais) |
| Cor de marca (splash screen, barra de status, cabeçalhos) | `{{COR_PRIMARIA}}` |
| Ícone, splash screen, favicon | conforme identidade visual da empresa |

## 2. Domínio específico do negócio a revisar

Estes pontos foram modelados para uma transportadora de carga rodoviária urbana/regional; **revise cada um** contra a realidade operacional da nova empresa antes de assumir que o valor padrão serve:

- **Tipos de veículo/transporte**: o sistema original usa uma lista fechada de 4 categorias com dimensões/capacidade fixas associadas (moto, utilitário pequeno, caminhão médio, caminhão grande). Redefina a lista, as dimensões e capacidades conforme a frota real da nova empresa — esses valores alimentam o popover de ajuda ao cliente e a lógica de correspondência motorista↔solicitação (regra 3 em `05`).
- **Regiões de precificação**: o sistema original detecta região a partir de uma lista fixa de nomes de cidade de uma única região metropolitana. Redefina a lista de regiões e a lista de cidades/áreas por região conforme `{{DOMINIO_GEOGRAFICO}}`, e revise a regra de "qual região vence quando origem e destino caem em regiões diferentes" (regra 5 em `05`) — pode não fazer sentido copiar a mesma prioridade se a geografia da nova empresa for muito diferente (ex.: operação nacional em vez de metropolitana).
- **Itens do checklist veicular**: os dois grupos de itens (materiais obrigatórios a bordo e condição do veículo) devem refletir a legislação/política de segurança aplicável à nova empresa e ao tipo de frota (uma frota só de motos tem itens de segurança bem diferentes de uma frota de caminhões).
- **Módulo de registro de almoço**: avalie se esse módulo (pausa + valor de reembolso + comprovante) faz sentido tal como está, ou se a nova empresa prefere generalizar para "registro de despesas/pausas" cobrindo outros tipos de gasto de motorista em rota (pedágio, estacionamento etc.).
- **Formas de pagamento aceitas**: revise a lista (pix/cartão/boleto/dinheiro é específico do contexto brasileiro) conforme o país/mercado de operação.
- **Fuso horário fixo**: troque o fuso horário fixo usado em todos os cálculos/exibições de data-hora para o fuso da região onde a nova empresa opera.

## 3. Papéis e estrutura organizacional

Avalie se a divisão de papéis do blueprint (`02`) reflete a estrutura da nova empresa. No sistema original, Admin/Gestor/Assistente Logístico têm exatamente o mesmo nível de acesso operacional (só Admin pode excluir usuários) — se a nova empresa tem uma hierarquia mais rígida entre esses papéis, isso deve ser redesenhado antes de implementar as regras de RLS.

## 4. Pontos "hardcoded" do sistema original — não copiar literalmente

Ao construir o novo sistema, evite reintroduzir estes padrões, que surgiram como atalhos pontuais no sistema original e não devem ser tratados como parte do blueprint:

- **Regra de relatório específica para um cliente por nome**: o sistema original tinha uma condição no gerador de PDF que adicionava colunas extras só quando o nome do cliente continha um texto específico. Se a nova empresa precisa de colunas de relatório diferentes por cliente, resolva isso com uma **configuração por cliente** (ex.: uma preferência salva no cadastro do cliente), não com comparação de texto no nome.
- **Mapa de correção de placas digitadas errado no passado**: o sistema original acumulou uma lista de "de-para" de placas com erro de digitação histórico, mantida manualmente no código, para os relatórios continuarem agregando corretamente. Prefira corrigir o dado na origem (permitir editar o campo do registro histórico) a manter uma tabela de correção paralela no código.
- **Campos de tipo/schema mantidos manualmente fora do gerador automático**: se a stack escolhida gera tipos/schema automaticamente a partir do banco (comum em stacks baseadas em Postgres gerenciado), evite editar esses arquivos gerados manualmente quando uma tabela nova é criada — sempre regenerar a partir do banco, para não divergir silenciosamente.
- **Componentes/telas duplicados sem uso**: como mencionado em `04`, não deixe uma segunda implementação "quase igual" de uma tela viva no projeto depois que uma versão mais completa a substituiu — remova a versão antiga.

## 5. Ordem sugerida de implementação

1. **Modelo de dados e regras de acesso** (`03` + `02`) — schema, RLS, funções auxiliares de permissão. É a base de tudo o resto.
2. **Autenticação e papéis** — login por usuário para contas administrativas, autocadastro como cliente, bootstrap do primeiro admin.
3. **Cadastros básicos** — clientes, veículos, motoristas, tipos de material, tabela de preços de frete (tela de Usuários e telas de apoio).
4. **Fluxo central de solicitação** — criação, listagem, aceite pelo motorista, transições de status, histórico de auditoria, diálogo unificado de detalhes (`04`, regras 1–4 em `05`).
5. **Rastreamento em tempo real** — localização do motorista, mapa de acompanhamento, tempo real + repescagem.
6. **Módulo de frota** — abastecimento, óleo, manutenção, checklist veicular, indicadores/gráficos (regras 6–8 em `05`).
7. **Módulo de pessoas** — registro de almoço/despesas (regra 9 em `05`).
8. **App mobile e notificações** — empacotamento Capacitor, push (`07`), publicação nas lojas.
9. **Relatórios/exportação em PDF** — por último, já que depende de todos os dados anteriores estarem consolidados.
