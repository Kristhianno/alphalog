# 07. App Mobile e Notificações

## Arquitetura mobile

O app nativo Android/iOS **não é reescrito separadamente** — é a mesma SPA web empacotada dentro de um shell nativo (ex.: Capacitor), que expõe pontes para funcionalidades nativas que o navegador não oferece (notificação push, splash screen nativa, barra de status, câmera/geolocalização em segundo plano).

- **Dois modos de build**: um para deploy web (com PWA/service worker habilitado) e outro para o pacote mobile (sem service worker — evita conflito com o WebView nativo, que já tem seu próprio ciclo de cache).
- **Identidade do app nativo** (a definir pela nova empresa): identificador único do app nas lojas (`{{APP_ID}}`), nome exibido (`{{EMPRESA}}`), cor de marca usada na splash screen e na barra de status (`{{COR_PRIMARIA}}`), ícone e imagem de abertura.
- **Limitações a considerar no design das telas**: dentro do WebView nativo, alguns comportamentos de navegador comum não se aplicam da mesma forma (abrir link externo, geolocalização contínua em segundo plano, notificação push) — cada um desses pontos deve passar pela ponte nativa correspondente, não pela API padrão do navegador.
- Plugins nativos mínimos necessários: notificações push, splash screen, barra de status, abertura de navegador externo (para o link de "traçar rota" no app de mapas).

## Configuração de autenticação para o app nativo

O app nativo carrega o conteúdo a partir de uma origem diferente da origem web pública (esquema próprio por plataforma, ex.: `https://localhost` no Android e `capacitor://localhost` no iOS) — a configuração de backend (URLs de redirecionamento permitidas para autenticação) precisa incluir **essas origens nativas além da origem web**, senão o login funciona no navegador mas falha silenciosamente dentro do app instalado.

## Arquitetura de notificação push (recomendada como referência única)

> Nota de reconciliação: o sistema original acumulou, ao longo do tempo, **duas abordagens de push conflitantes** documentadas em paralelo (uma baseada num serviço de push de terceiros já descontinuado, outra baseada em push nativo via serviço de mensagens do fabricante do sistema operacional) e **duas modelagens diferentes de tabela de token de dispositivo**. Nenhuma das duas chegou a ficar 100% concluída em produção. A especificação abaixo é a arquitetura **recomendada e limpa** para a nova implementação — trate como a única fonte de verdade, não tente reconciliar as duas versões antigas.

Fluxo:

```
Mudança relevante de status em uma solicitação
        │
        ▼
Gatilho de banco (dispara em INSERT/UPDATE da solicitação)
        │  faz uma chamada HTTP a partir do próprio banco
        ▼
Função de borda "notificar motorista"
        │  monta a mensagem, resolve quais tokens de dispositivo notificar
        ▼
Serviço de push nativo do fabricante (mensagens push do sistema operacional)
        │
        ▼
Notificação nativa no dispositivo do motorista (som + aparece mesmo com app fechado)
```

- **Tabela de tokens de dispositivo**: um token por dispositivo, vinculado ao usuário/motorista dono, com a plataforma (`android` / `ios` / `web`), único por (usuário, token) — para permitir múltiplos dispositivos por pessoa sem duplicar envio.
- **Registro do token**: ao logar no app nativo, o app pede permissão de notificação, obtém o token do dispositivo e o salva vinculado ao usuário autenticado; ao sair (logout), o token deve ser removido para não continuar recebendo notificações de uma sessão encerrada.

### Regra de mensagem por status (mapeamento sugerido)

| Status atingido | Mensagem | Destinatário |
|---|---|---|
| Solicitação disponível (`solicitada`/`enviada`) | "Nova corrida disponível" | todos os motoristas habilitados no tipo de veículo exigido |
| Aceita | "Corrida aceita" | o motorista que aceitou (confirmação) |
| Coletada | "Carga coletada" | conforme necessidade (ex.: cliente, se a empresa quiser notificar o cliente também) |
| Em rota | "Em rota de entrega" | idem |
| Entregue | "Entrega concluída" | idem |

- **App em segundo plano/fechado**: recebe a notificação nativa do sistema operacional, com som.
- **App aberto em primeiro plano**: em vez de notificação do sistema, mostra um aviso dentro do próprio app (toast) — a lista relevante já deve se atualizar sozinha via tempo real/repescagem (ver `06`), então a notificação em primeiro plano é só um reforço visual.
- **Toque na notificação**: deve levar direto para a tela/registro relacionado (deep link), não só abrir o app na tela inicial.

### Reforço sem push

Enquanto a notificação push nativa não estiver implementada (ou como complemento permanente), o app deve continuar funcionando corretamente por **tempo real + repescagem periódica curta** nas telas críticas (fila do motorista, painel), como já especificado em `06` — push é uma melhoria de experiência (avisa mesmo com app fechado), não a única forma do dado chegar atualizado.

## Publicação nas lojas (resumo)

**Ambas as lojas**, de forma geral, exigem: conta de desenvolvedor paga (única por plataforma, não por publicação), ícone e capturas de tela em tamanhos específicos, descrição curta e longa, política de privacidade publicada (obrigatória em ambas as lojas, já que o app coleta localização e dados pessoais), classificação indicativa de conteúdo, e processo de revisão manual antes de publicar (tipicamente 1 a 3 dias úteis).

**Checklist mínimo antes de submeter**:
- [ ] Identidade visual final (ícone, splash, nome) definida e aplicada.
- [ ] Build de produção gerado e assinado (chave de assinatura própria da empresa, armazenada com segurança — perder essa chave impede atualizar o app publicado no futuro).
- [ ] Política de privacidade publicada e linkada na ficha da loja, cobrindo a coleta de localização do motorista.
- [ ] Login funcionando dentro do app nativo (não só na versão web) — ver seção de configuração de autenticação acima.
- [ ] Testado em dispositivo físico real (notificação push e localização em segundo plano geralmente não funcionam corretamente em simulador/emulador).
- [ ] Credenciais de demonstração preparadas, caso a revisão da loja peça um login de teste para avaliar o app.
