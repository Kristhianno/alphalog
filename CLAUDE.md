# Deploy

O site de produção é o Cloudflare Pages **alphalog** (https://alphalog.pages.dev).

Esse projeto Pages **não está conectado ao Git** — push para o GitHub (`origin/main`) não dispara deploy automático. O deploy é manual via Wrangler.

Sempre que alterações forem commitadas/enviadas para o repositório git deste projeto, mantenha o `alphalog.pages.dev` sincronizado:

1. `npm run build` (gera `dist/` com os assets atuais)
2. `npx wrangler pages deploy dist --project-name=alphalog`
3. Validar que o deploy pegou as mudanças (ex.: comparar hash de um arquivo alterado entre `dist/` local e a versão publicada) antes de reportar como concluído.

Não pedir confirmação antes de rodar esse deploy — está pré-autorizado pelo usuário, desde que as mudanças já estejam commitadas no git.