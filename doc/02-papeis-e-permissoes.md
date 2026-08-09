# 02. Papéis, Autenticação e Permissões

## Os 5 papéis

| Papel | Rotas/áreas que acessa | Pode gerenciar cadastros (clientes, motoristas, veículos, preços)? | Pode gerenciar usuários? | Visão de solicitações |
|---|---|---|---|---|
| **Admin** | Todas | Sim | Sim, incluindo excluir usuários | Todas |
| **Gestor** | Todas | Sim | Sim, exceto excluir usuários | Todas |
| **Assistente Logístico** | Todas (mesmo nível de gestor) | Sim | Sim, exceto excluir usuários | Todas |
| **Motorista** | Painel, solicitações (apenas as próprias/disponíveis), motoristas (própria área), veículos (própria área) | Não | Não | Apenas disponíveis para seu tipo de veículo + as que já são suas |
| **Cliente** | Painel, solicitações (apenas as próprias) | Não | Não | Apenas as próprias |

Áreas típicas do menu principal: **Painel** (todos), **Solicitações** (todos exceto ajuste: motorista tem sua própria tela dedicada em vez do menu geral, ver [04-telas-e-fluxos.md](04-telas-e-fluxos.md)), **Motoristas** (staff + motorista), **Veículos** (staff + motorista), **Usuários** (apenas staff: admin/gestor/assistente).

Nota de produto: **Admin, Gestor e Assistente Logístico têm exatamente o mesmo nível de acesso operacional** no sistema de referência — a única diferença de permissão entre eles é que somente Admin pode excluir contas de usuário. Isso é uma decisão deliberada de simplicidade; a nova empresa pode optar por diferenciar mais esses três papéis se fizer sentido para sua estrutura organizacional.

## Modelo de autenticação

Duas formas de entrada no sistema, resultando em dois "tipos" de conta:

1. **Conta criada por um administrador/gestor** (tela de Usuários): o operador define um **nome de usuário** (não um e-mail real). Internamente, esse nome de usuário é transformado num e-mail sintético (`{usuario}@{{DOMINIO_INTERNO}}`) só para satisfazer o mecanismo de autenticação por e-mail/senha do backend — o usuário final só digita o nome de usuário e a senha na tela de login, nunca vê esse e-mail sintético. Esse tipo de conta pode receber qualquer papel (admin, gestor, assistente, motorista, cliente).
2. **Autocadastro público** (tela de registro): a pessoa se cadastra com nome, e-mail real e senha. Toda conta criada por autocadastro **nasce automaticamente como Cliente** — não é possível se autocadastrar como motorista, gestor ou admin.

Regra de recuperação de senha: só funciona para contas com e-mail real (autocadastradas), já que depende do backend enviar um e-mail de redefinição. Contas criadas por administrador (login por usuário) devem ter a senha redefinida por um admin através da própria tela de Usuários.

## Regra de bootstrap do primeiro administrador

No primeiro acesso de qualquer conta, se ainda não existir **nenhum registro de papel** em todo o sistema (ou seja, é literalmente o primeiro usuário a logar), essa conta é promovida automaticamente a **Admin**. Todo usuário seguinte que não tiver papel explícito definido cai no padrão de **Cliente**. Isso permite colocar o sistema em produção sem precisar de um passo manual de configuração de banco para criar o primeiro admin.

## Padrão de controle de acesso por linha (RLS)

O modelo de referência aplica as regras de permissão **no próprio banco de dados** (Row-Level Security), não apenas escondendo botões na interface — isso é o que garante que mesmo uma chamada direta à API não vaze dados de outro cliente/motorista. O padrão se repete em praticamente toda tabela de domínio:

- Duas funções auxiliares reutilizáveis: **"é administração?"** (verdadeiro para admin/gestor/assistente logístico) e **"é admin estrito?"** (verdadeiro só para admin, usada nas poucas ações mais sensíveis, como excluir usuário).
- **Regra do dono**: em tabelas operacionais do motorista (registros de abastecimento, óleo, manutenção, checklist, almoço, localização), o motorista só enxerga e edita os próprios registros (vínculo motorista ↔ usuário autenticado).
- **Regra da administração**: quem é admin/gestor/assistente enxerga e edita todos os registros de todas as tabelas de domínio.
- **Regra do cliente**: o cliente só enxerga/edita suas próprias solicitações (vínculo por e-mail entre a conta autenticada e o cadastro de cliente), e apenas enquanto a solicitação está no status inicial (ver regra 7 em [05-regras-de-negocio.md](05-regras-de-negocio.md)).
- **Acesso anônimo é sempre negado** explicitamente em todas as tabelas de domínio — só chamadas privilegiadas de backend (funções de borda) usam uma chave de serviço para operações administrativas como criação/exclusão de conta.
- **Arquivos anexados** (fotos, comprovantes, documentos) ficam em armazenamento privado; o acesso é resolvido por URL assinada de curta duração, gerada sob demanda, nunca por link público permanente.

## Regras finas de permissão específicas

- **Cliente só edita/cancela a própria solicitação enquanto ela ainda está no status inicial** (antes de qualquer motorista aceitar). Depois disso, qualquer alteração passa a ser responsabilidade da central.
- **Cliente só visualiza a localização em tempo real do motorista enquanto a própria entrega está em andamento** (aceita/coletada/em rota) — não tem acesso à localização do motorista fora desse contexto.
- **Motorista só vê como "disponíveis" as solicitações cujo tipo de veículo exigido bate com os tipos de veículo que ele está cadastrado para dirigir** (um motorista pode estar habilitado para mais de um tipo).
- **Edição de valor de frete e forma de pagamento é exclusiva da administração** — motorista e cliente nunca veem/editam esses campos como editáveis, no máximo como leitura (motorista nem isso).
- **Exclusão definitiva de registros** (excluir uma solicitação inteira, excluir um usuário) é restrita à administração; qualquer papel operacional (motorista/cliente) no máximo pode "cancelar" (mudança de status), nunca apagar.
