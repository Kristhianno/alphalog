# Deploy

O site de produção é o Cloudflare Pages **alphalog** (https://alphalog.pages.dev).

Esse projeto Pages **está conectado ao Git** (repositório `alphalog`, branch de produção `main`). Push para `origin/main` dispara deploy automático no Cloudflare Pages — não é preciso rodar Wrangler manualmente. Configuração de build no Cloudflare: comando `npm run build`, diretório de saída `dist`.

Sempre que alterações forem commitadas neste projeto, envie (`git push`) para `origin/main` para manter o `alphalog.pages.dev` sincronizado. Depois do push, é possível acompanhar o andamento do deploy na aba "Deployments" do projeto no dashboard do Cloudflare Pages.

Não pedir confirmação antes de dar push para `main` — está pré-autorizado pelo usuário, desde que as mudanças já estejam commitadas no git.