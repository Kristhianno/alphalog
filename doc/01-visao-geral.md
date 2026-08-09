# 01. Visão Geral do Produto

## O que é o produto

Um **sistema de gestão logística** (web + mobile) para uma empresa de transporte/entregas ({{EMPRESA}}), que coordena três frentes ao redor do ciclo de vida de uma **solicitação de frete/entrega** ("corrida"):

- Uma **central operacional** (administradores, gestores e assistentes logísticos) que cadastra clientes, motoristas e veículos, cria e acompanha solicitações, define preços de frete e extrai relatórios.
- **Motoristas**, que veem as corridas disponíveis compatíveis com o veículo que dirigem, aceitam, executam e atualizam o status da entrega, e registram operações da própria rotina (abastecimento, manutenção, checklist do veículo, pausa para almoço).
- **Clientes**, que solicitam entregas, acompanham o status em tempo real (incluindo localização do motorista) e têm acesso limitado às próprias solicitações.

O sistema roda como **aplicação web responsiva (SPA)**, instalável como PWA, e também como **app nativo Android/iOS** compilado a partir do mesmo código-base via Capacitor — a mesma base de UI atende os três formatos.

## Objetivos de negócio

- **Rastreabilidade completa**: toda mudança de status de uma entrega fica registrada em um histórico auditável (quem mudou, quando, com que evidência).
- **Agilidade na alocação**: corridas ficam visíveis apenas para motoristas cujo veículo é compatível com o tipo de carga/transporte exigido, e o primeiro motorista a aceitar "ganha" a corrida — sem coordenação manual por telefone/rádio.
- **Visibilidade para o cliente**: o cliente acompanha o andamento da própria entrega, incluindo a localização do motorista em tempo real enquanto ela está em trânsito, sem precisar ligar para a central.
- **Controle de custo de frota**: histórico de combustível, troca de óleo e manutenção por veículo, com alertas automáticos (ex.: troca de óleo vencida) e indicadores agregados (custo por veículo, consumo médio).
- **Conformidade operacional**: checklist veicular pré-viagem (itens de segurança e materiais obrigatórios) e evidência fotográfica na coleta da carga.
- **Precificação consistente**: tabela de preços de frete por cliente, tipo de veículo e região, com possibilidade de ajuste manual pontual quando necessário.

## Perfis de usuário

| Papel | Quem é | Resumo do que faz no sistema |
|---|---|---|
| **Admin** | Dono/administrador geral do sistema | Acesso total; único que pode excluir usuários; gerencia tudo que gestor gerencia. |
| **Gestor** | Gerente operacional | Gerencia clientes, motoristas, veículos, preços, solicitações e usuários (exceto exclusão de usuário); vê todos os relatórios. |
| **Assistente Logístico** | Apoio operacional do dia a dia | Mesmo nível de acesso operacional do gestor (cadastros, solicitações, frota, usuários), pensado para quem opera o sistema no dia a dia sem ser o gestor titular. |
| **Motorista** | Motorista próprio ou agregado | Vê e aceita corridas compatíveis com seu veículo, atualiza status de entrega, registra abastecimento/manutenção/checklist do próprio veículo e pausas de almoço. |
| **Cliente** | Empresa ou pessoa que contrata o frete | Cria e acompanha as próprias solicitações; só edita/cancela enquanto a solicitação ainda não foi aceita. |

Detalhamento completo de permissões em [02-papeis-e-permissoes.md](02-papeis-e-permissoes.md).

## Arquitetura em alto nível

```
┌──────────────────────────────┐
│   Frontend SPA (React)       │  Web responsivo + PWA instalável
│   - Telas/roteamento         │
│   - Cache/estado (React Query)│
└───────────────┬───────────────┘
                │ HTTPS / WebSocket
                ▼
┌──────────────────────────────┐
│   Backend as a Service        │  Postgres (dados + regras via RLS)
│   - Banco de dados            │  Auth (login/sessão)
│   - Autenticação              │  Storage (anexos/arquivos privados)
│   - Storage de arquivos       │  Realtime (mudanças ao vivo)
│   - Funções de borda (server) │  Edge Functions (operações privilegiadas)
│   - Agendador (cron)          │  Cron (processar agendamentos)
└───────────────┬───────────────┘
                │
                ▼
┌──────────────────────────────┐
│  Serviços externos             │
│  - Geocodificação de endereço  │  (ex.: Nominatim/Photon, OpenStreetMap)
│  - Mapas (rastreamento ao vivo)│  (ex.: Leaflet + tiles OSM)
└──────────────────────────────┘

┌──────────────────────────────┐
│  Shell nativo (Capacitor)      │  Empacota a mesma SPA como app
│  - Android / iOS                │  Android/iOS, adiciona splash screen,
│  - Plugins nativos               │  status bar, notificações push,
└──────────────────────────────┘  geolocalização em segundo plano.
```

Princípios de arquitetura que valem a pena preservar na nova implementação:
- **Uma única base de código** para web, PWA e apps nativos (não duas implementações separadas).
- **Regras de acesso aplicadas no banco** (não só na UI), via políticas de segurança por linha — a UI é uma camada de conveniência, não a barreira de segurança.
- **Tempo real por assinatura de mudanças no banco**, com repescagem periódica (polling) curta como rede de segurança em telas críticas (ex.: fila de corridas do motorista), para tolerar falhas de rede/conexões instáveis intermitentes.
- **Fuso horário fixo da região de operação** aplicado consistentemente em todo cálculo/exibição de data e hora, para evitar bugs de "corrida criada no dia errado" perto da meia-noite.

## Glossário de domínio

| Termo | Significado |
|---|---|
| **Solicitação / corrida** | Um pedido de transporte de um ponto de origem a um ponto de destino, para um cliente, com um tipo de veículo exigido. É a entidade central do sistema. |
| **Status da solicitação** | Estado atual da corrida no seu ciclo de vida (solicitada → aceita → coletada → em rota → entregue, entre outros — ver [05-regras-de-negocio.md](05-regras-de-negocio.md)). |
| **Frete** | Valor cobrado pelo transporte, determinado por cliente + tipo de veículo + região, com possibilidade de ajuste manual por solicitação. |
| **Região de precificação** | Zona geográfica (ex.: capital, cidade vizinha, região metropolitana) usada para determinar o preço do frete, detectada automaticamente a partir dos endereços de origem/destino. |
| **Tipo de veículo / transporte** | Categoria de veículo (ex.: moto, utilitário, caminhão pequeno, caminhão grande) que determina que corridas um motorista pode ver e aceitar, e que preço se aplica. |
| **Motorista fixo vs. agregado** | Motorista fixo é funcionário próprio da empresa; agregado é um motorista terceirizado/parceiro que roda com veículo próprio ou da frota sob outro regime contratual. |
| **Checklist veicular** | Vistoria periódica (tipicamente antes de rodar) que o motorista preenche cobrindo itens de segurança do veículo e materiais obrigatórios. |
| **Registro de almoço** | Registro do horário de saída/retorno do intervalo de almoço do motorista, com valor de reembolso e comprovante, para fins de controle e prestação de contas. |
| **Anexo/evidência** | Arquivo (foto ou documento) vinculado a um registro (solicitação, checklist, log de manutenção etc.), armazenado de forma privada e acessível apenas por quem tem permissão sobre aquele registro. |
