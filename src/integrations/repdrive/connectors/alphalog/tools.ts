import { SUGGESTED_QUESTIONS, answerFreeText } from "@/features/ai-assistant/aiEngine"
import { resolveFreight } from "@/domain/pricing"
import { STATUS_LABELS, isActiveStatus } from "@/domain/requestStatus"
import { deriveCurrentKm, latestOilChange } from "@/domain/vehicleKm"
import { countNegativeAnswers } from "@/domain/checklist"
import { externalMapsUrl } from "@/lib/maps"
import { PAYMENT_METHOD_LABELS, VEHICLE_TYPE_LABELS } from "@/lib/constants"
import { formatCurrency, formatDate } from "@/lib/format"
import { STAFF_ROLES, VEHICLE_TYPES } from "@/types/enums"
import type { Solicitacao } from "@/types/entities"
import type { Connector, RepdriveActor, ToolDef } from "../../core/types"
import { answerToWhatsApp, bulletList } from "../../core/whatsappFormat"
import { findVisibleRequest, loadAlphaLog, visibleRequests, type AlphaLogCtx } from "./data"
import { estimateRequest, formatWhen, isSameDayBR, type Moment } from "./estimate"

type Tool = ToolDef<AlphaLogCtx>

const DAY_MS = 86_400_000

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

function clientName(ctx: AlphaLogCtx, id: string): string {
  return ctx.db.clientes.find((c) => c.id === id)?.name ?? "Cliente não identificado"
}

function freightOf(ctx: AlphaLogCtx, r: Solicitacao): number | undefined {
  return resolveFreight({
    clientId: r.client_id,
    transportType: r.transport_type,
    originAddress: r.origin_address,
    destinationAddress: r.destination_address,
    freightOverride: r.freight_override,
    priceTable: ctx.db.precos,
  }).price
}

function moment(label: string, m: Moment | undefined, now: Date): string | undefined {
  if (!m) return undefined
  return m.done ? `${label}: ${formatWhen(m.at, now)} ✅` : `${label}: *${formatWhen(m.at, now)}* (previsão)`
}

function notFound(numero: unknown, actor: RepdriveActor): string {
  const scope = actor.role === "cliente" ? " entre as suas solicitações" : actor.role === "motorista" ? " entre as suas corridas" : ""
  return numero
    ? `Não encontrei a solicitação #${String(numero).replace(/\D/g, "")}${scope}.`
    : "Informe o número da solicitação (ex.: 1012)."
}

// --- Gestor -----------------------------------------------------------

const TOPICOS = SUGGESTED_QUESTIONS.map((q) => `${q.id} (${q.question})`).join("; ")

const painelGestao: Tool = {
  name: "painel_gestao",
  description: `Indicadores prontos da operação, frota, motoristas, financeiro, clientes e usuários. Tópicos válidos: ${TOPICOS}`,
  roles: STAFF_ROLES,
  params: [{ name: "topico", type: "string", description: "id do tópico, ex.: resumo, faturamento-mes, manutencao" }],
  run: (ctx, _actor, args) => {
    const q = SUGGESTED_QUESTIONS.find((x) => x.id === String(args.topico ?? "").trim())
    if (!q) return `Tópico inválido. Use um destes: ${SUGGESTED_QUESTIONS.map((x) => x.id).join(", ")}`
    return answerToWhatsApp(q.run(ctx.ai))
  },
}

const consultaGestao: Tool = {
  name: "consulta_gestao",
  description:
    "Busca pontual: número de solicitação (ex.: 'solicitação 1012'), placa de veículo, nome de cliente, nome de motorista (e 'onde está o João'), solicitações por status (ex.: 'em rota', 'pendentes de coleta'), pausas de almoço.",
  roles: STAFF_ROLES,
  params: [{ name: "texto", type: "string", description: "o que buscar, em português" }],
  run: (ctx, _actor, args) => answerToWhatsApp(answerFreeText(String(args.texto ?? ""), ctx.ai)),
}

const tabelaFrete: Tool = {
  name: "tabela_frete",
  description: `Tabela de preços de frete por cliente × tipo de veículo (${VEHICLE_TYPES.join(", ")}) × região. Todos os filtros são opcionais.`,
  roles: STAFF_ROLES,
  params: [
    { name: "cliente", type: "string", description: "parte do nome do cliente" },
    { name: "tipo_veiculo", type: "string", description: VEHICLE_TYPES.join(" | ") },
    { name: "regiao", type: "string", description: "Região Central | Região Norte | Região Sul" },
  ],
  run: (ctx, _actor, args) => {
    const cliente = args.cliente ? normalize(String(args.cliente)) : ""
    const tipo = args.tipo_veiculo ? normalize(String(args.tipo_veiculo)) : ""
    const regiao = args.regiao ? normalize(String(args.regiao)) : ""
    const rows = ctx.db.precos.filter(
      (p) =>
        (!cliente || normalize(clientName(ctx, p.client_id)).includes(cliente)) &&
        (!tipo || p.transport_type.includes(tipo) || normalize(VEHICLE_TYPE_LABELS[p.transport_type]).includes(tipo)) &&
        (!regiao || normalize(p.region).includes(regiao)),
    )
    if (rows.length === 0) return "Nenhum preço cadastrado para esse filtro — o frete fica 'a combinar'."
    const shown = rows.slice(0, 15).map(
      (p) => `${clientName(ctx, p.client_id)} · ${VEHICLE_TYPE_LABELS[p.transport_type]} · ${p.region}: *${formatCurrency(p.price)}*`,
    )
    return `${rows.length} preço(s) encontrado(s)${rows.length > 15 ? " (mostrando 15)" : ""}:\n${bulletList(shown)}`
  },
}

// --- Motorista -----------------------------------------------------------

function driverRequestBlock(ctx: AlphaLogCtx, r: Solicitacao, now: Date): string {
  const est = estimateRequest(ctx.db, r, now)
  const beforePickup = !est.pickup?.done
  const next = beforePickup ? r.origin_address : r.destination_address
  return [
    `*#${r.request_number}* — ${STATUS_LABELS[r.status]} · ${clientName(ctx, r.client_id)}`,
    `📦 Coleta: ${r.origin_address}`,
    `🏁 Entrega: ${r.destination_address} (~${est.distanceKm} km, ~${est.transitMin} min)`,
    moment("🕒 Saída para coleta", est.departure, now),
    moment("📥 Coleta", est.pickup, now),
    moment("📤 Entrega", est.delivery, now),
    r.status !== "entregue" && r.status !== "cancelada" ? `🗺️ Próximo ponto: ${externalMapsUrl(next)}` : undefined,
  ]
    .filter(Boolean)
    .join("\n")
}

const minhasCorridas: Tool = {
  name: "minhas_corridas",
  description:
    "Corridas do motorista com rota (coleta → entrega), distância, horário de saída, horários previstos de coleta e entrega e link do mapa. escopo: ativas (padrão) | hoje | historico (entregues nos últimos 30 dias).",
  roles: ["motorista"],
  params: [{ name: "escopo", type: "string", description: "ativas | hoje | historico" }],
  run: (ctx, actor, args) => {
    const now = new Date()
    const own = visibleRequests(ctx.db, actor)
    const escopo = String(args.escopo ?? "ativas")

    if (escopo === "historico") {
      const done = own
        .filter((r) => r.status === "entregue" && r.delivered_at && now.getTime() - Date.parse(r.delivered_at) <= 30 * DAY_MS)
        .sort((a, b) => Date.parse(b.delivered_at!) - Date.parse(a.delivered_at!))
      if (done.length === 0) return "Nenhuma entrega concluída nos últimos 30 dias."
      return `${done.length} entrega(s) concluída(s) nos últimos 30 dias:\n${bulletList(
        done.map((r) => `#${r.request_number} · ${clientName(ctx, r.client_id)} · ${formatDate(r.delivered_at)}`),
      )}`
    }

    const selected = own.filter((r) =>
      escopo === "hoje"
        ? isActiveStatus(r.status) || (r.delivered_at != null && isSameDayBR(new Date(r.delivered_at), now))
        : isActiveStatus(r.status),
    )
    if (selected.length === 0) return "Você não tem corridas ativas no momento."

    const ordered = selected
      .map((r) => ({ r, key: estimateRequest(ctx.db, r, now).delivery?.at.getTime() ?? 0 }))
      .sort((a, b) => a.key - b.key)
      .map((x) => x.r)
    return `Você tem ${ordered.length} corrida(s) ${escopo === "hoje" ? "hoje" : "ativa(s)"}, na ordem sugerida:\n\n${ordered
      .map((r) => driverRequestBlock(ctx, r, now))
      .join("\n\n")}`
  },
}

const detalheCarga: Tool = {
  name: "detalhe_carga",
  description: "Detalhes de uma corrida/carga do motorista: tipo de material e cuidados, NF, OP, contato do solicitante, forma de pagamento, observações, rota e horários.",
  roles: ["motorista"],
  params: [{ name: "numero", type: "number", description: "número da solicitação, ex.: 1012" }],
  run: (ctx, actor, args) => {
    const r = findVisibleRequest(ctx.db, actor, args.numero)
    if (!r) return notFound(args.numero, actor)
    const material = ctx.db.tiposMaterial.find((m) => m.id === r.material_type_id)
    return [
      driverRequestBlock(ctx, r, new Date()),
      "",
      `📋 Carga: *${material?.name ?? "não informado"}*${material?.requires_special_handling ? " ⚠️ exige manuseio especial" : ""}`,
      material?.description ? `   ${material.description}` : undefined,
      `🧾 NF: ${r.invoice_number ?? "—"} · OP: ${r.op_number ?? "—"}`,
      `👤 Solicitante: ${r.requester} · ${r.requester_phone}`,
      `💳 Pagamento: ${r.payment_method ? PAYMENT_METHOD_LABELS[r.payment_method] : "—"}`,
      r.notes ? `📝 Obs.: ${r.notes}` : undefined,
    ]
      .filter((l) => l !== undefined)
      .join("\n")
  },
}

const minhaDocumentacao: Tool = {
  name: "minha_documentacao",
  description: "Documentação e situação do motorista: CNH (categoria e validade), veículo fixo (placa, documento, status), KM atual, próxima troca de óleo e último checklist.",
  roles: ["motorista"],
  params: [],
  run: (ctx, actor) => {
    const m = ctx.db.motoristas.find((x) => x.id === actor.driverId)
    if (!m) return "Não encontrei seu cadastro de motorista."
    const now = Date.now()
    const cnhDays = Math.ceil((Date.parse(`${m.cnh_valid_until}T00:00:00`) - now) / DAY_MS)
    const cnh = cnhDays < 0 ? `❌ vencida há ${-cnhDays} dia(s)` : cnhDays <= 30 ? `⚠️ vence em ${cnhDays} dia(s)` : "✅ em dia"
    const lines = [
      `*${m.name}* (${m.is_fixed ? "fixo" : "agregado"})`,
      `🪪 CNH ${m.license_number}, categoria ${m.cnh_category}, válida até ${formatDate(m.cnh_valid_until)} — ${cnh}`,
      `🚚 Habilitado para: ${m.enabled_vehicle_types.map((t) => VEHICLE_TYPE_LABELS[t]).join(", ")}`,
    ]

    const v = m.vehicle_id ? ctx.db.veiculos.find((x) => x.id === m.vehicle_id) : undefined
    if (v) {
      const km = deriveCurrentKm({ vehicleId: v.id, fuelLogs: ctx.db.combustivel, oilChanges: ctx.db.oleo, maintenanceLogs: ctx.db.manutencao })
      const oil = latestOilChange(v.id, ctx.db.oleo)
      const statusLabel = v.status === "active" ? "ativo" : v.status === "maintenance" ? "em manutenção" : "inativo"
      lines.push(
        `🚐 Veículo: *${v.plate}* — ${v.brand} ${v.model} (${v.year}), ${statusLabel}. Documento (CRLV): ${v.document_number}`,
        `📍 KM atual: ${km.toLocaleString("pt-BR")} km`,
      )
      if (oil) {
        const left = oil.next_change_km - km
        lines.push(
          left <= 0
            ? `🛢️ Troca de óleo *vencida* (passou ${(-left).toLocaleString("pt-BR")} km)`
            : `🛢️ Próxima troca de óleo em ${oil.next_change_km.toLocaleString("pt-BR")} km (faltam ${left.toLocaleString("pt-BR")} km)`,
        )
      }
      const last = ctx.db.checklists
        .filter((c) => c.driver_id === m.id || c.vehicle_id === v.id)
        .sort((a, b) => Date.parse(b.checklist_date) - Date.parse(a.checklist_date))[0]
      if (last) {
        const failed = [...last.materiais, ...last.veiculo].filter((i) => i.status === "nao").map((i) => i.label)
        const negatives = countNegativeAnswers(last.materiais) + countNegativeAnswers(last.veiculo)
        lines.push(
          negatives === 0
            ? `✅ Último checklist (${formatDate(last.checklist_date)}): tudo aprovado`
            : `⚠️ Último checklist (${formatDate(last.checklist_date)}): ${negatives} item(ns) reprovado(s) — ${failed.join(", ")}`,
        )
      } else {
        lines.push("📋 Nenhum checklist registrado ainda.")
      }
    } else {
      lines.push("🚐 Sem veículo fixo vinculado.")
    }
    return lines.join("\n")
  },
}

// --- Cliente -----------------------------------------------------------

const minhasSolicitacoes: Tool = {
  name: "minhas_solicitacoes",
  description: "Solicitações de frete do cliente com status atual e previsão de entrega. escopo: ativas (padrão, inclui agendadas e aguardando motorista) | entregues | todas.",
  roles: ["cliente"],
  params: [{ name: "escopo", type: "string", description: "ativas | entregues | todas" }],
  run: (ctx, actor, args) => {
    const now = new Date()
    const escopo = String(args.escopo ?? "ativas")
    const own = visibleRequests(ctx.db, actor)
    const selected = own
      .filter((r) =>
        escopo === "todas" ? true : escopo === "entregues" ? r.status === "entregue" : r.status !== "entregue" && r.status !== "cancelada",
      )
      .sort((a, b) => b.request_number - a.request_number)
      .slice(0, 10)
    if (selected.length === 0) return escopo === "ativas" ? "Você não tem solicitações em andamento." : "Nenhuma solicitação encontrada."

    return `${selected.length} solicitação(ões):\n${bulletList(
      selected.map((r) => {
        const est = estimateRequest(ctx.db, r, now)
        const when =
          r.status === "cancelada"
            ? "cancelada"
            : est.delivery?.done
              ? `entregue ${formatWhen(est.delivery.at, now)}`
              : est.delivery
                ? `entrega prevista ${formatWhen(est.delivery.at, now)}`
                : ""
        return `*#${r.request_number}* — ${STATUS_LABELS[r.status]} · ${r.destination_address.split(" - ").pop()} · ${when}`
      }),
    )}`
  },
}

const acompanharCarga: Tool = {
  name: "acompanhar_carga",
  description: "Rastreio completo de uma carga do cliente: status, linha do tempo, previsão de coleta e de entrega, motorista, veículo, última localização e valor do frete.",
  roles: ["cliente"],
  params: [{ name: "numero", type: "number", description: "número da solicitação, ex.: 1012" }],
  run: (ctx, actor, args) => {
    const r = findVisibleRequest(ctx.db, actor, args.numero)
    if (!r) return notFound(args.numero, actor)
    const now = new Date()
    const est = estimateRequest(ctx.db, r, now)
    const driver = r.driver_id ? ctx.db.motoristas.find((m) => m.id === r.driver_id) : undefined
    const vehicle = r.vehicle_id ? ctx.db.veiculos.find((v) => v.id === r.vehicle_id) : undefined
    const loc = r.driver_id ? ctx.db.localizacoes.find((l) => l.driver_id === r.driver_id && l.delivery_request_id === r.id) : undefined
    const history = ctx.db.historicoStatus
      .filter((h) => h.delivery_request_id === r.id)
      .sort((a, b) => Date.parse(a.changed_at) - Date.parse(b.changed_at))

    return [
      `*Solicitação #${r.request_number}* — ${STATUS_LABELS[r.status]}`,
      `📦 ${r.origin_address} → ${r.destination_address}`,
      r.status === "cancelada" ? `❌ Cancelada${r.notes ? `: ${r.notes}` : ""}` : undefined,
      moment("📥 Coleta", est.pickup, now),
      moment("📤 Entrega", est.delivery, now),
      driver ? `🚚 Motorista: ${driver.name.split(" ")[0]}${vehicle ? ` · ${VEHICLE_TYPE_LABELS[vehicle.type]} placa ${vehicle.plate}` : ""}` : "🚚 Aguardando um motorista aceitar a corrida.",
      loc ? `📍 Última posição do veículo: ${formatWhen(new Date(loc.updated_at), now)}, a ${loc.speed ?? 0} km/h` : undefined,
      `💰 Frete: ${formatCurrency(freightOf(ctx, r))}`,
      r.invoice_number ? `🧾 NF: ${r.invoice_number}` : undefined,
      "",
      "Linha do tempo:",
      bulletList(history.map((h) => `${STATUS_LABELS[h.status]} — ${formatWhen(new Date(h.changed_at), now)}`)),
    ]
      .filter((l) => l !== undefined)
      .join("\n")
  },
}

export const alphaLogConnector: Connector<AlphaLogCtx> = {
  id: "alphalog",
  load: () => loadAlphaLog(),
  tools: [painelGestao, consultaGestao, tabelaFrete, minhasCorridas, detalheCarga, minhaDocumentacao, minhasSolicitacoes, acompanharCarga],
}
