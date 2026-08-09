# 06. Stack Técnica e Integrações

Stack recomendada, comprovada em produção no sistema de referência. Não é obrigatório usar exatamente as mesmas ferramentas, mas cada escolha abaixo resolveu um problema real do domínio (indicado entre parênteses) — vale considerar antes de trocar por outra.

## Frontend

- **React + TypeScript + Vite** — SPA com build rápido; um modo de build separado para o pacote mobile (sem service worker de PWA embutido, para não conflitar com o WebView nativo) e outro para o deploy web (com PWA habilitado).
- **Tailwind CSS + biblioteca de componentes acessíveis baseada em Radix (padrão shadcn/ui)** — consistência visual rápida de montar, componentes acessíveis por padrão (modais, menus, combobox).
- **React Query (TanStack Query)** — camada única de cache/estado para tudo que vem do backend; centraliza invalidação de cache e retry automático (com tolerância a rede instável — comum em motoristas em trânsito).
- **React Hook Form + Zod** — formulários com validação declarativa; usado em todo formulário de cadastro/registro do sistema.
- **Gráficos** (biblioteca tipo Recharts) — para os dashboards de frota e indicadores.

## Backend (arquitetura "backend as a service")

Um provedor Postgres gerenciado com autenticação, storage de arquivos, tempo real e funções de borda embutidos (ex.: Supabase ou equivalente) resolve, de uma vez, os seguintes requisitos do domínio:

- **Banco relacional (Postgres)** com **Row-Level Security** como camada de autorização (ver `02` e `03`) — a regra de acesso vive no banco, não só no frontend.
- **Autenticação** com sessão persistida localmente no dispositivo e renovação automática de token — necessário para o app mobile continuar logado entre usos.
- **Storage de arquivos privado**, com geração de URL assinada temporária — para anexos/evidências (ver `03`).
- **Tempo real (assinatura de mudanças no banco)** — para listas que precisam refletir mudanças de outros usuários imediatamente (fila de corridas do motorista, painel da administração, acompanhamento do cliente).
- **Funções de borda (serverless) com privilégio elevado** — para as poucas operações que exigem permissão administrativa sobre contas de usuário (criar, redefinir senha, excluir, trocar e-mail) e que não devem ser expostas com a chave pública do app.
- **Agendador (cron) + chamadas HTTP disparadas por gatilho de banco** — para a promoção automática de solicitações agendadas (regra 1 em `05`) e para disparo de notificação (ver `07`).

### Funções de borda necessárias

| Função | Propósito | Quem pode chamar |
|---|---|---|
| Criar usuário | Cria conta de autenticação + perfil + papel (e, se motorista, o cadastro de motorista) num único passo atômico | administração |
| Editar e-mail de usuário | Propaga a troca de e-mail para a conta de autenticação e para todos os cadastros relacionados (motorista, cliente) que guardam cópia do e-mail | administração |
| Redefinir senha | Define uma nova senha para outra conta sem exigir a senha antiga | administração |
| Excluir usuário | Remove perfil, papel e conta de autenticação; impede autoexclusão | apenas o papel mais restrito da administração (ver nota em `02`) |
| Login por nome de usuário | Resolve o nome de usuário digitado para a conta interna correspondente e autentica | público (é o próprio mecanismo de login) |
| Processar solicitações agendadas | Roda a cada minuto; promove `agendada` → `solicitada` quando a data programada chega | disparada só pelo agendador interno |
| Notificar motorista | Envia notificação push quando uma solicitação muda de status relevante | disparada só por gatilho de banco (ver `07`) |

## Serviços externos de apoio

| Necessidade | Solução usada no sistema de referência | Por quê |
|---|---|---|
| Geocodificação de endereço (autocompletar + estimativa de distância) | Nominatim (OpenStreetMap) como principal, com um segundo provedor (ex.: Photon) como reserva quando o primeiro retorna poucos resultados | gratuito, sem necessidade de chave de API paga; viés de busca configurável para a área de atuação da empresa |
| Mapa de rastreamento ao vivo | Leaflet + tiles do OpenStreetMap | leve, sem custo de licenciamento por carregamento de mapa |
| Exportação de relatórios em PDF | Geração no próprio navegador/app (biblioteca de PDF client-side + extensão de tabela) | não depende de um serviço de backend adicional só para gerar relatório |
| Datas/horas | Biblioteca de manipulação de datas + fuso horário **fixo** da região de operação aplicado em todo cálculo e toda exibição | evita bugs de "registro criado no dia errado" perto da meia-noite quando servidor e usuário estão em fusos diferentes |
| Instalação como app (PWA) | Plugin de PWA do bundler + manifest + ícones | permite "instalar" o app a partir do navegador sem passar pela loja, útil para adoção inicial |

## Padrão de dados no cliente

- **React Query como única fonte de cache** no frontend — nenhuma tela mantém cópia própria de estado remoto fora dele; toda mutação invalida as chaves de cache relacionadas.
- **Tempo real → invalidação de cache em cascata**: ao assinar mudanças de uma tabela (ex.: solicitações), o efeito correto não é só atualizar aquela lista, mas invalidar todas as consultas relacionadas na tela atual (ex.: contadores, painel, fila do motorista) para manter tudo consistente sem duplicar lógica de atualização manual.
- **Repescagem periódica curta como rede de segurança** em telas onde perder uma atualização em tempo real tem custo alto (ex.: fila de corridas disponíveis do motorista) — não depender só da assinatura em tempo real, que pode falhar silenciosamente em redes móveis instáveis.
- **Rascunho de formulário salvo localmente no dispositivo** (não só em memória) para formulários longos preenchidos em campo (ex.: nova solicitação, registros de veículo) — protege contra perda de digitação se o app for interrompido/for para segundo plano no celular.
