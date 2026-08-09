# Blueprint de App de Gestão Logística — Índice

Este pacote de documentos é um **blueprint reutilizável** extraído de um sistema de gestão logística real, já em produção, que conecta uma central operacional (administradores/gestores), motoristas e clientes em torno do ciclo de vida de solicitações de frete/entrega. O conteúdo aqui descreve **telas, regras de negócio e modelo de dados** com detalhamento suficiente para servir de especificação para a construção de um app equivalente para **outra empresa** de transporte/logística, sem depender do código-fonte original.

## Convenção de placeholders

Os textos usam variáveis entre chaves duplas para tudo que deve ser definido pela nova empresa antes de iniciar o desenvolvimento:

| Placeholder | Significado | Exemplo de preenchimento |
|---|---|---|
| `{{EMPRESA}}` | Nome comercial da empresa | "Transportes Rápido Norte" |
| `{{DOMINIO_INTERNO}}` | Domínio fictício usado para login por usuário (não precisa existir de verdade) | `rapidonorte.internal` |
| `{{APP_ID}}` | Identificador do app nas lojas (bundle id) | `br.com.rapidonorte.app` |
| `{{COR_PRIMARIA}}` | Cor de marca usada em splash screen, status bar e cabeçalhos | `#1B4D89` |
| `{{DOMINIO_GEOGRAFICO}}` | Região/cidades onde a empresa opera, usada na precificação por região | "Grande Porto Alegre" |

Qualquer outro nome próprio (clientes, placas, cidades específicas) usado como *exemplo* ao longo destes documentos é apenas ilustrativo e deve ser substituído pelos dados reais da nova empresa durante a implementação.

## Como usar este blueprint

1. Leia `01-visao-geral.md` para entender o produto como um todo antes de mergulhar nos detalhes.
2. Leia `08-guia-de-customizacao.md` **antes de codificar** — ele lista exatamente o que precisa ser decidido/trocado para a nova empresa (identidade visual, tipos de veículo, regiões, itens de checklist etc.), evitando retrabalho.
3. Use `02` a `07` como especificação funcional durante a implementação, na ordem sugerida em `08-guia-de-customizacao.md` (schema → papéis → cadastros → fluxo de solicitação → frota → mobile/push → relatórios).
4. Trate as regras de `05-regras-de-negocio.md` como a "fonte da verdade" do comportamento esperado do sistema — é a parte mais valiosa deste blueprint, pois captura decisões de produto que não são óbvias só olhando as telas.

## Sumário dos arquivos

| Arquivo | Conteúdo |
|---|---|
| [01-visao-geral.md](01-visao-geral.md) | O que é o produto, objetivos de negócio, perfis de usuário, arquitetura de alto nível e glossário de domínio. |
| [02-papeis-e-permissoes.md](02-papeis-e-permissoes.md) | Os 5 papéis de usuário, modelo de autenticação, regras de bootstrap do primeiro admin e padrão de controle de acesso por linha (RLS). |
| [03-modelo-de-dados.md](03-modelo-de-dados.md) | As ~18 entidades do domínio, colunas, relacionamentos, enums/estados e convenção de armazenamento de arquivos. |
| [04-telas-e-fluxos.md](04-telas-e-fluxos.md) | As 9 telas do sistema: rota, papéis com acesso, elementos de UI, ações disponíveis e sub-fluxos importantes. |
| [05-regras-de-negocio.md](05-regras-de-negocio.md) | As 12 regras de negócio transversais que definem o comportamento real do sistema, independente da tela. |
| [06-stack-tecnica-e-integracoes.md](06-stack-tecnica-e-integracoes.md) | Stack recomendada, bibliotecas de apoio, funções de backend (edge functions) e padrão de cache/tempo real no cliente. |
| [07-mobile-app-e-notificacoes.md](07-mobile-app-e-notificacoes.md) | Arquitetura do app mobile (Capacitor), arquitetura de notificação push de referência e checklist de publicação nas lojas. |
| [08-guia-de-customizacao.md](08-guia-de-customizacao.md) | O que trocar para adaptar este blueprint a uma nova empresa, armadilhas conhecidas a evitar e ordem sugerida de implementação. |
| [09-deploy-cloudflare-pages.md](09-deploy-cloudflare-pages.md) | Processo real de publicação deste protótipo no Cloudflare Pages via upload direto pela CLI (Wrangler), sem depender de integração com GitHub. |
