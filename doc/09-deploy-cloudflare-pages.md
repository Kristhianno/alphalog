# 09. Deploy no Cloudflare Pages

Este documento registra o processo real usado para publicar este protótipo (SPA estático, sem backend próprio) no Cloudflare Pages via upload direto pela CLI — sem depender de integração com GitHub. É o caminho mais rápido quando o push para o repositório remoto está bloqueado (permissão de conta, por exemplo) ou quando não se quer configurar CI para um protótipo.

## Por que serve para este projeto

O app é uma SPA (React + Vite) com todo o "backend" simulado no navegador (`localStorage`, ver `06-stack-tecnica-e-integracoes.md`) — não existe servidor para hospedar, só os arquivos estáticos gerados pelo build. Isso torna hospedagem estática (Cloudflare Pages, Vercel, Netlify) a opção natural; Cloudflare Pages foi a escolhida aqui.

## Pré-requisitos

- Conta Cloudflare (gratuita).
- Node/npm instalados (já necessários para o projeto).
- Não é necessário instalar a CLI globalmente — o comando `npx wrangler` baixa a versão mais recente sob demanda na primeira execução.

## Passo 1 — Build de produção

```bash
cd alphalog
npm run build
```

Isso roda `tsc -b && vite build` e gera a pasta `dist/` com os arquivos estáticos finais. Sempre rodar este passo antes de cada deploy — o Wrangler publica o conteúdo de `dist/` exatamente como está no disco, não builda por conta própria.

## Passo 2 — Autenticação (só na primeira vez por máquina)

```bash
npx wrangler login
```

Abre uma aba no navegador para autorizar via OAuth com a conta Cloudflare. As credenciais ficam salvas em `~/Library/Preferences/.wrangler/config/default.toml` (macOS) — não precisa repetir esse passo nos deploys seguintes, a menos que o token expire ou seja revogado.

Para conferir se já está autenticado:

```bash
npx wrangler whoami
```

## Passo 3 — Criar o projeto Pages (só na primeira vez)

```bash
npx wrangler pages project create alphalog --production-branch=main
```

Cria o projeto `alphalog` no painel do Cloudflare Pages, com URL estável reservada em `https://alphalog.pages.dev`. Não precisa repetir para deploys seguintes — só na primeira vez.

> **Nota**: a API do Cloudflare eventualmente retorna um erro 500 transitório (`code: 8000000`) nesse passo. Se acontecer, rodar o mesmo comando de novo costuma resolver — foi o que aconteceu na criação deste projeto.

## Passo 4 — Deploy

```bash
npx wrangler pages deploy dist --project-name=alphalog --branch=main
```

Cada execução deste comando é um novo deploy. A saída traz duas URLs:

- **URL do projeto** (estável, não muda entre deploys): `https://alphalog.pages.dev`
- **URL do deployment específico** (muda a cada deploy, ex.: `https://062ba063.alphalog.pages.dev`) — útil para comparar versões, mas o certificado TLS desse subdomínio efêmero pode levar um ou dois minutos para propagar logo após o deploy. Para uso normal, sempre compartilhar a **URL do projeto**.

## Roteamento client-side (React Router)

Não foi necessário nenhum arquivo `_redirects` ou `_routes.json` em `public/` — o Cloudflare Pages já serve `index.html` como fallback para rotas sem arquivo correspondente, então navegação direta para rotas internas (ex.: `https://alphalog.pages.dev/solicitacoes`) funciona normalmente, inclusive em recarregamento de página.

## Fluxo completo (deploys seguintes)

Depois da configuração inicial (passos 1–3), publicar uma atualização é só:

```bash
cd alphalog
npm run build
npx wrangler pages deploy dist --project-name=alphalog
```

## Alternativa não usada aqui: deploy automático via GitHub

O Cloudflare Pages também suporta conectar o repositório GitHub direto no painel (Workers & Pages → criar projeto → "Connect to Git"), fazendo build e deploy automático a cada push. Essa opção **não foi usada neste projeto** porque o push para `github.com/Kristhianno/alphalog` estava bloqueado por permissão de conta (usuário autenticado no Git local sem acesso de escrita ao repositório) no momento do primeiro deploy. Quando esse acesso for resolvido, migrar para deploy automático via Git é uma melhoria natural — evita ter que lembrar de rodar o build+deploy manualmente a cada mudança.

## Domínio customizado (opcional, não configurado)

O painel do projeto (dash.cloudflare.com → Workers & Pages → `alphalog` → Custom domains) permite apontar um domínio próprio no lugar de `alphalog.pages.dev`. Não foi configurado neste protótipo.