// Gera n8n/repdrive.workflow.json: empacota src/integrations/repdrive (rolldown, já instalado
// com o Vite) e embute os bundles nos Code nodes do workflow. Rodar: npm run build:repdrive
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { rolldown } from "rolldown"

const root = path.resolve(import.meta.dirname, "..")
const outDir = path.join(root, "n8n")

/** Grupos de demonstração e override da URL da Evolution — editáveis também direto no nó Roteador. */
const DEMO_GROUP_JIDS = (process.env.REPDRIVE_GROUP_JIDS ?? "120363412777463012@g.us").split(",").map((s) => s.trim()).filter(Boolean)
const EVOLUTION_URL = process.env.REPDRIVE_EVOLUTION_URL ?? ""
// Agente de IA ligado por padrão; REPDRIVE_USE_AI=0 volta a responder só por regras com os dados do AlphaLog
const USE_AI = (process.env.REPDRIVE_USE_AI ?? "1") === "1"
// anthropic (padrão, claude-haiku-4-5-20251001 — conectar a credencial depois) ou openai ("OpenAI account")
const PROVIDER = process.env.REPDRIVE_PROVIDER ?? "anthropic"
const MODEL = process.env.REPDRIVE_MODEL ?? (PROVIDER === "anthropic" ? "claude-haiku-4-5-20251001" : "gpt-4o-mini")
const ANTHROPIC_CREDENTIAL = { id: process.env.REPDRIVE_ANTHROPIC_CREDENTIAL_ID ?? "uNhdE7wr66UeKdh9", name: "Anthropic RepDrive" }
// Transcrição de áudio (Whisper no Groq) — credencial header "Authorization: Bearer gsk_..."
const GROQ_CREDENTIAL = { id: process.env.REPDRIVE_GROQ_CREDENTIAL_ID ?? "BtVwcc4Z487N8TVC", name: "Groq Whisper" }
const OPENAI_CREDENTIAL_ID = process.env.REPDRIVE_OPENAI_CREDENTIAL_ID ?? "quyUfoekmfCT3E4Y"
// Redis guarda a sessão de cada lead (uma chave por lead) e a memória da conversa
const REDIS_CREDENTIAL = { id: process.env.REPDRIVE_REDIS_CREDENTIAL_ID ?? "6ppBIFF5AgjwEA5F", name: "Redis account" }

async function bundle(entry) {
  const build = await rolldown({
    input: path.join(root, "src/integrations/repdrive/entries", entry),
    resolve: { alias: { "@": path.join(root, "src") } },
    platform: "neutral",
    logLevel: "warn",
  })
  const { output } = await build.generate({ format: "iife", name: "Repdrive", minify: true })
  await build.close()
  return output[0].code
}

const entradaJs = await bundle("entrada.ts")
const consultaJs = await bundle("consulta.ts")

// Avalia o bundle de consulta aqui mesmo para ler as definições das ferramentas.
const { toolDefs } = new Function(`${consultaJs}; return Repdrive;`)()

// --- nós -----------------------------------------------------------

let nextId = 1
const node = (name, type, typeVersion, position, parameters, extra = {}) => ({
  id: `repdrive-${nextId++}`,
  name,
  type,
  typeVersion,
  position,
  parameters,
  ...extra,
})

const roteadorCode = `// ===== CONFIGURAÇÃO =====
// Grupos fixos de demonstração (opcional — o normal é mandar /repdrive-ativar no grupo).
const DEMO_GROUP_JIDS = ${JSON.stringify(DEMO_GROUP_JIDS)};
// Deixe vazio para usar a server_url e a apikey que a própria Evolution envia no webhook.
const EVOLUTION_URL = ${JSON.stringify(EVOLUTION_URL)};
const EVOLUTION_APIKEY = "";
// =========================

${entradaJs}

// A sessão do lead vem do Redis (nó anterior); só dedupe e grupos ativados ficam no static data.
// o nó do Redis devolve só { session }; mensagem e chave vêm do nó "Chave da sessão"
const src = $("Injetar transcrição").isExecuted ? $("Injetar transcrição").first().json : $("Chave da sessão").first().json;
const inp = { ...src, session: $input.first().json.session };
const state = $getWorkflowStaticData("global");
const work = { seen: state.seen, demoGroups: state.demoGroups, sessions: {} };
if (inp.session) {
  try {
    work.sessions[inp.sessionKey] = typeof inp.session === "string" ? JSON.parse(inp.session) : inp.session;
  } catch (e) {}
}
const out = Repdrive.handleWebhook(inp.body ?? {}, work, {
  demoGroupJids: DEMO_GROUP_JIDS,
  evolutionUrl: EVOLUTION_URL,
  evolutionApiKey: EVOLUTION_APIKEY,
});
state.seen = work.seen;
state.demoGroups = work.demoGroups;
if (!out) return [];
const session = work.sessions[inp.sessionKey];
return [{ json: { ...out, sessionKey: inp.sessionKey, sessionJson: session ? JSON.stringify(session) : "" } }];`

const chaveCode = `${entradaJs}

const body = $input.first().json.body ?? {};
return [{ json: { body, sessionKey: Repdrive.sessionKeyOf(body) ?? "sem-chave", audio: Repdrive.audioOf(body) } }];`

const prepararAudioCode = `const c = $("Chave da sessão").first().json;
const baixado = $input.first().json;
const b64 = c.audio.base64 || baixado.base64;
if (!b64) return [{ json: { semAudio: true } }];
const ext = (c.audio.mimetype.split("/")[1] || "ogg").replace("mpeg", "mp3");
return [{ json: {}, binary: { audio: { data: b64, mimeType: c.audio.mimetype, fileName: "audio." + ext } } }];`

const injetarCode = `${entradaJs}

// Troca o áudio pelo texto transcrito; sem transcrição, segue como áudio (o Roteador pede para digitar).
const c = $("Chave da sessão").first().json;
const text = String($input.first().json.text ?? "").trim();
if (!text) return [{ json: c }];
return [{ json: { ...c, body: Repdrive.withTranscription(c.body, text) } }];`

const montarCode = `${entradaJs}

const r = $("Roteador").first().json;
const text = Repdrive.finalizeReply($input.first().json.output);
return [{ json: { send: { ...r.send, body: { ...r.send.body, text } } } }];`

const consultaCode = `${consultaJs}

const i = $input.first().json;
const args = {};
for (const k of ${JSON.stringify([...new Set(toolDefs.flatMap((t) => t.params.map((p) => p.name)))])}) {
  if (i[k] !== undefined && i[k] !== null && i[k] !== "") args[k] = i[k];
}
return [{ json: { resposta: Repdrive.consultar(i.persona, i.ferramenta, args) } }];`

const allParams = [...new Map(toolDefs.flatMap((t) => t.params).map((p) => [p.name, p])).values()]

const webhook = node("Webhook Evolution", "n8n-nodes-base.webhook", 2.1, [0, 300], {
  httpMethod: "POST",
  path: "repdrive",
  options: {},
})
webhook.webhookId = "repdrive-evolution"

const chave = node("Chave da sessão", "n8n-nodes-base.code", 2, [200, 300], { jsCode: chaveCode })

const ehAudio = node("É áudio?", "n8n-nodes-base.if", 2.3, [400, 300], {
  conditions: {
    options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 3 },
    conditions: [
      { id: "cond-audio", leftValue: "={{ !!$json.audio }}", rightValue: true, operator: { type: "boolean", operation: "true", singleValue: true } },
    ],
    combinator: "and",
  },
  looseTypeValidation: true,
  options: {},
})

const temAudio = node("Áudio veio no webhook?", "n8n-nodes-base.if", 2.3, [600, 560], {
  conditions: {
    options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 3 },
    conditions: [
      { id: "cond-b64", leftValue: "={{ !!$json.audio.base64 }}", rightValue: true, operator: { type: "boolean", operation: "true", singleValue: true } },
    ],
    combinator: "and",
  },
  looseTypeValidation: true,
  options: {},
})

const baixarAudio = node(
  "Baixar áudio (Evolution)",
  "n8n-nodes-base.httpRequest",
  4.4,
  [800, 680],
  {
    method: "POST",
    url: '={{ String($json.body.server_url || "").replace(/\\/+$/, "") + "/chat/getBase64FromMediaMessage/" + $json.body.instance }}',
    sendHeaders: true,
    headerParameters: { parameters: [{ name: "apikey", value: "={{ $json.body.apikey }}" }] },
    sendBody: true,
    specifyBody: "json",
    jsonBody: "={{ JSON.stringify({ message: { key: { id: $json.audio.messageId } }, convertToMp4: false }) }}",
    options: { timeout: 20000 },
  },
  { onError: "continueRegularOutput" },
)

const prepararAudio = node("Preparar áudio", "n8n-nodes-base.code", 2, [1000, 560], { jsCode: prepararAudioCode })

const transcrever = node(
  "Transcrever (Groq Whisper)",
  "n8n-nodes-base.httpRequest",
  4.4,
  [1200, 560],
  {
    method: "POST",
    url: "https://api.groq.com/openai/v1/audio/transcriptions",
    authentication: "genericCredentialType",
    genericAuthType: "httpHeaderAuth",
    sendBody: true,
    contentType: "multipart-form-data",
    bodyParameters: {
      parameters: [
        { parameterType: "formBinaryData", name: "file", inputDataFieldName: "audio" },
        { parameterType: "formData", name: "model", value: "whisper-large-v3-turbo" },
        { parameterType: "formData", name: "language", value: "pt" },
        { parameterType: "formData", name: "response_format", value: "json" },
      ],
    },
    options: { timeout: 30000 },
  },
  { onError: "continueRegularOutput", credentials: { httpHeaderAuth: GROQ_CREDENTIAL } },
)

const injetar = node("Injetar transcrição", "n8n-nodes-base.code", 2, [1400, 560], { jsCode: injetarCode })

const lerSessao = node(
  "Ler sessão (Redis)",
  "n8n-nodes-base.redis",
  1,
  [1600, 300],
  { operation: "get", propertyName: "session", key: "=repdrive:sessao:{{ $json.sessionKey }}", keyType: "automatic", options: {} },
  { credentials: { redis: REDIS_CREDENTIAL } },
)

const roteador = node("Roteador", "n8n-nodes-base.code", 2, [1800, 300], { jsCode: roteadorCode })

const gravarSessao = node(
  "Gravar sessão (Redis)",
  "n8n-nodes-base.redis",
  1,
  [2020, 100],
  {
    operation: "set",
    key: "=repdrive:sessao:{{ $json.sessionKey }}",
    value: "={{ $json.sessionJson }}",
    keyType: "string",
    expire: true,
    ttl: 86400,
  },
  { credentials: { redis: REDIS_CREDENTIAL } },
)

const ifAgent = node("Precisa da IA?", "n8n-nodes-base.if", 2.3, [2020, 300], {
  conditions: {
    options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 3 },
    conditions: [
      {
        id: "cond-agent",
        leftValue: "={{ $json.action }}",
        rightValue: "agent",
        operator: { type: "string", operation: "equals" },
      },
    ],
    combinator: "and",
  },
  options: {},
})

const agent = node(
  "Agente Repdrive",
  "@n8n/n8n-nodes-langchain.agent",
  3.1,
  [2260, 160],
  {
    promptType: "define",
    text: "={{ $json.chatInput }}",
    options: { systemMessage: "={{ $json.systemPrompt }}", maxIterations: 6 },
  },
  { onError: "continueRegularOutput", ...(USE_AI ? {} : { disabled: true }) },
)

const semIaCode = `${consultaJs}

// Com IA ligada, só entra em ação se o agente falhar (sem crédito, fora do ar, resposta vazia).
const ai = $input.first().json.output;
if (typeof ai === "string" && ai.trim()) return [{ json: { output: ai } }];
const r = $("Roteador").first().json;
return [{ json: { output: Repdrive.responderSemIA(r.persona, r.chatInput) } }];`

const semIa = node("Responder com dados AlphaLog", "n8n-nodes-base.code", 2, [2460, 160], { jsCode: semIaCode })

const model =
  PROVIDER === "anthropic"
    ? node(
        "Claude (Anthropic)",
        "@n8n/n8n-nodes-langchain.lmChatAnthropic",
        1.3,
        [2160, 440],
        { model: { __rl: true, mode: "id", value: MODEL }, options: { maxTokensToSample: 1024, temperature: 0.2 } },
        { credentials: { anthropicApi: ANTHROPIC_CREDENTIAL }, ...(USE_AI ? {} : { disabled: true }) },
      )
    : node(
        "Modelo IA",
        "@n8n/n8n-nodes-langchain.lmChatOpenAi",
        1.3,
        [2160, 440],
        { model: { __rl: true, mode: "id", value: MODEL }, options: { maxTokens: 1024, temperature: 0.2 } },
        OPENAI_CREDENTIAL_ID ? { credentials: { openAiApi: { id: OPENAI_CREDENTIAL_ID, name: "OpenAI account" } } } : {},
      )

const memory = node(
  "Memória da conversa (Redis)",
  "@n8n/n8n-nodes-langchain.memoryRedisChat",
  1.6,
  [2320, 440],
  {
    sessionIdType: "customKey",
    sessionKey: '={{ "repdrive:chat:" + $("Roteador").first().json.memoryKey }}',
    sessionTTL: 7200,
    contextWindowLength: 10,
  },
  { credentials: { redis: REDIS_CREDENTIAL } },
)

const tools = toolDefs.map((t, idx) => {
  const value = {
    persona: '={{ $("Roteador").first().json.persona }}',
    ferramenta: t.name,
  }
  for (const p of t.params) {
    value[p.name] = `={{ $fromAI(${JSON.stringify(p.name)}, ${JSON.stringify(p.description)}, "${p.type}") }}`
  }
  const schemaFields = ["persona", "ferramenta", ...allParams.map((p) => p.name)]
  return node(
    t.name,
    "@n8n/n8n-nodes-langchain.toolWorkflow",
    2.2,
    [2480 + (idx % 4) * 160, 440 + Math.floor(idx / 4) * 160],
    {
      description: `${t.description} (perfis: ${t.roles.join(", ")})`,
      workflowId: { __rl: true, mode: "id", value: "={{ $workflow.id }}" },
      workflowInputs: {
        mappingMode: "defineBelow",
        value,
        matchingColumns: [],
        schema: schemaFields.map((id) => ({
          id,
          displayName: id,
          required: false,
          defaultMatch: false,
          display: true,
          canBeUsedToMatch: true,
          type: "string",
          removed: false,
        })),
        attemptToConvertTypes: false,
        convertFieldsToString: false,
      },
    },
  )
})

const montar = node("Montar resposta", "n8n-nodes-base.code", 2, [2660, 160], { jsCode: montarCode })

const enviar = node("Enviar WhatsApp", "n8n-nodes-base.httpRequest", 4.4, [2880, 300], {
  method: "POST",
  url: "={{ $json.send.url }}",
  sendHeaders: true,
  headerParameters: { parameters: [{ name: "apikey", value: "={{ $json.send.apikey }}" }] },
  sendBody: true,
  specifyBody: "json",
  jsonBody: "={{ JSON.stringify($json.send.body) }}",
  options: {},
})

const trigger = node("Ferramentas (chamadas pela IA)", "n8n-nodes-base.executeWorkflowTrigger", 1.1, [0, 900], {
  workflowInputs: {
    values: ["persona", "ferramenta", ...allParams.map((p) => p.name)].map((name) => ({ name })),
  },
})

const consulta = node("Consultar dados", "n8n-nodes-base.code", 2, [240, 900], { jsCode: consultaCode })

const sticky = node("Leia-me", "n8n-nodes-base.stickyNote", 1, [-40, -120], {
  width: 620,
  height: 380,
  content: [
    "## Repdrive — demo no grupo do WhatsApp",
    "1. Perguntas vão para o **Agente Repdrive** (Claude Haiku 4.5, credencial *Anthropic RepDrive*). Se a IA falhar, **Responder com dados AlphaLog** responde por regras. Só regras, sem IA: gere com REPDRIVE_USE_AI=0.",
    "2. Publique o workflow e copie a *Production URL* do nó **Webhook Evolution**.",
    "3. Na Evolution (instância), configure o Webhook com essa URL e o evento **MESSAGES_UPSERT**.",
    "4. O grupo Repdrive já vem configurado em `DEMO_GROUP_JIDS` (nó **Roteador**). Outros grupos: `/repdrive-ativar`.",
    "5. Mande qualquer mensagem no grupo → aparece o menu (1 Gestor, 2 Motorista, 3 Cliente, 4 Menu).",
    "",
    "Código-fonte: `src/integrations/repdrive` (repo alphalog). Gerado por `npm run build:repdrive` — não edite os bundles à mão.",
  ].join("\n"),
})

const nodes = [sticky, webhook, chave, ehAudio, temAudio, baixarAudio, prepararAudio, transcrever, injetar, lerSessao, roteador, gravarSessao, ifAgent, semIa, agent, model, memory, ...tools, montar, enviar, trigger, consulta]

const connections = {
  [webhook.name]: { main: [[{ node: chave.name, type: "main", index: 0 }]] },
  [chave.name]: { main: [[{ node: ehAudio.name, type: "main", index: 0 }]] },
  [ehAudio.name]: {
    main: [
      [{ node: temAudio.name, type: "main", index: 0 }],
      [{ node: lerSessao.name, type: "main", index: 0 }],
    ],
  },
  [temAudio.name]: {
    main: [
      [{ node: prepararAudio.name, type: "main", index: 0 }],
      [{ node: baixarAudio.name, type: "main", index: 0 }],
    ],
  },
  [baixarAudio.name]: { main: [[{ node: prepararAudio.name, type: "main", index: 0 }]] },
  [prepararAudio.name]: { main: [[{ node: transcrever.name, type: "main", index: 0 }]] },
  [transcrever.name]: { main: [[{ node: injetar.name, type: "main", index: 0 }]] },
  [injetar.name]: { main: [[{ node: lerSessao.name, type: "main", index: 0 }]] },
  [lerSessao.name]: { main: [[{ node: roteador.name, type: "main", index: 0 }]] },
  [roteador.name]: {
    main: [
      [
        // gravar primeiro (fica acima no canvas): a sessão persiste mesmo se o envio falhar
        { node: gravarSessao.name, type: "main", index: 0 },
        { node: ifAgent.name, type: "main", index: 0 },
      ],
    ],
  },
  [ifAgent.name]: {
    main: [
      [{ node: USE_AI ? agent.name : semIa.name, type: "main", index: 0 }],
      [{ node: enviar.name, type: "main", index: 0 }],
    ],
  },
  [agent.name]: { main: [[{ node: semIa.name, type: "main", index: 0 }]] },
  [semIa.name]: { main: [[{ node: montar.name, type: "main", index: 0 }]] },
  [montar.name]: { main: [[{ node: enviar.name, type: "main", index: 0 }]] },
  [model.name]: { ai_languageModel: [[{ node: agent.name, type: "ai_languageModel", index: 0 }]] },
  [memory.name]: { ai_memory: [[{ node: agent.name, type: "ai_memory", index: 0 }]] },
  [trigger.name]: { main: [[{ node: consulta.name, type: "main", index: 0 }]] },
}
for (const t of tools) {
  connections[t.name] = { ai_tool: [[{ node: agent.name, type: "ai_tool", index: 0 }]] }
}

const workflow = {
  name: "RepDrive",
  nodes,
  connections,
  settings: { executionOrder: "v1", callerPolicy: "workflowsFromSameOwner" },
}

await mkdir(outDir, { recursive: true })
await writeFile(path.join(outDir, "repdrive.workflow.json"), `${JSON.stringify(workflow, null, 2)}\n`)
console.log(
  `n8n/repdrive.workflow.json gerado — ${USE_AI ? "IA ligada" : "modo sem IA"}, ${toolDefs.length} ferramentas, bundles ${(entradaJs.length / 1024).toFixed(0)} KB + ${(consultaJs.length / 1024).toFixed(0)} KB, modelo ${MODEL}` +
    (DEMO_GROUP_JIDS.length ? `, grupos: ${DEMO_GROUP_JIDS.join(", ")}` : ", ative o grupo com /repdrive-ativar"),
)
