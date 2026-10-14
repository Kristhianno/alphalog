// Publica n8n/repdrive.workflow.json no workflow "RepDrive" do n8n (PUT na API; workflow ativo
// é republicado na hora). Rodar depois de `npm run build:repdrive`: npm run publish:repdrive
// A chave da API vem de ../segredos/n8n.env (N8N_URL, N8N_API_KEY), fora do repositório.
// Se o workflow foi editado no n8n depois da última publicação por este script, para sem
// sobrescrever — rode com --force depois de conferir.
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const WORKFLOW_ID = process.env.REPDRIVE_WORKFLOW_ID ?? "vILPGKAfPfMqMheX"
const envFile = path.join(root, "..", "segredos", "n8n.env")
// guarda o updatedAt da última publicação (fora do git, junto dos segredos)
const stampFile = path.join(root, "..", "segredos", "repdrive-publicado.json")

const env = Object.fromEntries(
  (await readFile(envFile, "utf8"))
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]
    }),
)
const base = env.N8N_URL.replace(/\/$/, "")
const headers = { "X-N8N-API-KEY": env.N8N_API_KEY, "Content-Type": "application/json" }
const url = `${base}/api/v1/workflows/${WORKFLOW_ID}`

const live = await (await fetch(url, { headers })).json()
if (!live.nodes) throw new Error(`Não consegui ler o workflow ${WORKFLOW_ID}: ${JSON.stringify(live).slice(0, 300)}`)

const stamp = await readFile(stampFile, "utf8").then(JSON.parse).catch(() => undefined)
if (stamp && stamp.updatedAt !== live.updatedAt && !process.argv.includes("--force")) {
  console.error(
    `O workflow foi alterado no n8n em ${live.updatedAt} (última publicação: ${stamp.updatedAt}).\n` +
      "Confira as mudanças feitas lá antes de sobrescrever e rode de novo com --force.",
  )
  process.exit(1)
}

const local = JSON.parse(await readFile(path.join(root, "n8n/repdrive.workflow.json"), "utf8"))
// a API recusa settings.binaryMode no PUT — só executionOrder
const body = { name: live.name, nodes: local.nodes, connections: local.connections, settings: { executionOrder: "v1" } }
const res = await fetch(url, { method: "PUT", headers, body: JSON.stringify(body) })
const saved = await res.json()
if (!res.ok || !saved.nodes) throw new Error(`Falha ao publicar (${res.status}): ${JSON.stringify(saved).slice(0, 500)}`)

await writeFile(stampFile, JSON.stringify({ updatedAt: saved.updatedAt }, null, 2))
console.log(`"${saved.name}" publicado — ${saved.nodes.length} nós, ativo: ${saved.active}, atualizado em ${saved.updatedAt}`)
