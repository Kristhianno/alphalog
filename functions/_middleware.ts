/**
 * Cloudflare Pages Function: o mesmo projeto Pages atende dois sites.
 * - www.repdrive.com.br → landing page do Repdrive (arquivos em public/lp)
 * - qualquer outro host (alphalog.pages.dev etc.) → app AlphaLog, sem mudança
 */

type Context = {
  request: Request
  env: { ASSETS: { fetch: (req: Request) => Promise<Response> } }
  next: () => Promise<Response>
}

const LANDING_HOST = "www.repdrive.com.br"
const LANDING_DIR = "/lp"
const LANDING_PATHS = new Set([
  "/",
  "/styles.css",
  "/main.js",
  "/favicon.png",
  "/apple-touch-icon.png",
  "/repdrive-nome.png",
  "/repdrive-logo.png",
  "/iphone-frame.webp",
  "/hero-bg.webp",
  "/hero-bg-900.webp",
  "/alphadata-logo.webp",
  "/privacidade",
  "/robots.txt",
  "/sitemap.xml",
])

// Desinstala o service worker do site antigo (app de representantes) que ficou registrado neste
// domínio nos navegadores de quem o usou: limpa os caches dele e recarrega a página.
const KILL_SW = `self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key)
    await self.registration.unregister()
    for (const client of await self.clients.matchAll({ type: "window" })) client.navigate(client.url)
  })())
})
`
const OLD_SW_PATHS = new Set(["/sw.js", "/service-worker.js"])

export const onRequest = async ({ request, env, next }: Context): Promise<Response> => {
  const url = new URL(request.url)
  if (url.hostname !== LANDING_HOST && url.hostname !== "repdrive.com.br") return next()

  // sem www → com www
  if (url.hostname !== LANDING_HOST) {
    url.hostname = LANDING_HOST
    return Response.redirect(url.toString(), 301)
  }

  if (OLD_SW_PATHS.has(url.pathname)) {
    return new Response(KILL_SW, {
      headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store" },
    })
  }

  const path = url.pathname.replace(/\/index(\.html)?$/, "/").replace(/\.html$/, "")
  if (!LANDING_PATHS.has(path)) return Response.redirect(`https://${LANDING_HOST}/`, 302)

  const asset = await env.ASSETS.fetch(new Request(new URL(LANDING_DIR + path, url), request))
  const res = new Response(asset.body, asset)
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  // páginas: sempre conferir a versão nova; CSS/JS com ?v= mudam de endereço a cada versão
  const isPage = (res.headers.get("Content-Type") ?? "").includes("text/html")
  if (isPage) res.headers.set("Cache-Control", "no-cache")
  else if (url.searchParams.has("v")) res.headers.set("Cache-Control", "public, max-age=31536000, immutable")
  return res
}
