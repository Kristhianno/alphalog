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
  "/privacidade",
  "/robots.txt",
  "/sitemap.xml",
])

export const onRequest = async ({ request, env, next }: Context): Promise<Response> => {
  const url = new URL(request.url)
  if (url.hostname !== LANDING_HOST && url.hostname !== "repdrive.com.br") return next()

  // sem www → com www
  if (url.hostname !== LANDING_HOST) {
    url.hostname = LANDING_HOST
    return Response.redirect(url.toString(), 301)
  }

  const path = url.pathname.replace(/\/index(\.html)?$/, "/").replace(/\.html$/, "")
  if (!LANDING_PATHS.has(path)) return Response.redirect(`https://${LANDING_HOST}/`, 302)

  const asset = await env.ASSETS.fetch(new Request(new URL(LANDING_DIR + path, url), request))
  const res = new Response(asset.body, asset)
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  return res
}
