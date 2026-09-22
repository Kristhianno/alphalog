import { resolveFreight } from "@/domain/pricing"
import { isDriverOnline } from "@/domain/driverAvailability"
import { STATUS_LABELS, isActiveStatus } from "@/domain/requestStatus"
import { STATUS_BADGE_VARIANT } from "@/lib/constants"
import { formatCurrency, formatDate } from "@/lib/format"
import type {
  Cliente,
  ChecklistVeiculo,
  LogCombustivel,
  Motorista,
  PrecoDeFrete,
  RegistroManutencao,
  Solicitacao,
  TrocaDeOleo,
  Veiculo,
} from "@/types/entities"

/** Dados mockados disponíveis para o assistente responder — tudo já vem dos hooks existentes. */
export interface AiContext {
  solicitacoes: Solicitacao[]
  motoristas: Motorista[]
  veiculos: Veiculo[]
  clientes: Cliente[]
  precos: PrecoDeFrete[]
  combustivel: LogCombustivel[]
  oleo: TrocaDeOleo[]
  manutencao: RegistroManutencao[]
  checklists: ChecklistVeiculo[]
}

export type AiBadgeVariant = (typeof STATUS_BADGE_VARIANT)[keyof typeof STATUS_BADGE_VARIANT]

export interface AiResultItem {
  id: string
  title: string
  subtitle?: string
  meta?: string
  badge?: { label: string; variant: AiBadgeVariant }
}

export interface AiStat {
  label: string
  value: string
  tone?: "default" | "success" | "warning" | "destructive"
}

export interface AiAnswer {
  text: string
  stats?: AiStat[]
  items?: AiResultItem[]
}

export interface AiQuestion {
  id: string
  category: string
  question: string
  run: (ctx: AiContext) => AiAnswer
}

const DAY_MS = 86_400_000

function clienteName(ctx: AiContext, id: string): string {
  return ctx.clientes.find((c) => c.id === id)?.name ?? "Cliente não identificado"
}

function motoristaName(ctx: AiContext, id: string): string {
  return ctx.motoristas.find((m) => m.id === id)?.name ?? "Motorista não identificado"
}

function veiculoPlate(ctx: AiContext, id: string): string {
  return ctx.veiculos.find((v) => v.id === id)?.plate ?? "placa não identificada"
}

function freightOf(ctx: AiContext, r: Solicitacao): number {
  const { price } = resolveFreight({
    clientId: r.client_id,
    transportType: r.transport_type,
    originAddress: r.origin_address,
    destinationAddress: r.destination_address,
    freightOverride: r.freight_override,
    priceTable: ctx.precos,
  })
  return price ?? 0
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS)
}

function humanizeOpenSince(iso: string): string {
  const days = daysSince(iso)
  if (days <= 0) {
    const hours = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000))
    return `há ${hours}h`
  }
  return `há ${days} dia${days === 1 ? "" : "s"}`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function daysUntil(dateOnly: string): number {
  const target = new Date(`${dateOnly}T00:00:00`)
  return Math.ceil((target.getTime() - Date.now()) / DAY_MS)
}

// --- Operação -----------------------------------------------------------

function vehiclesNeedingMaintenance(ctx: AiContext): AiResultItem[] {
  return maintenanceAnswer(ctx).items ?? []
}

function operationalSummary(ctx: AiContext): AiAnswer {
  const active = ctx.solicitacoes.filter((r) => isActiveStatus(r.status))
  const now = new Date()
  const deliveredToday = ctx.solicitacoes.filter(
    (r) => r.status === "entregue" && r.delivered_at && isSameDay(new Date(r.delivered_at), now),
  )
  const attention = active.filter((r) => daysSince(r.created_at) >= 2)
  const critical = active.filter((r) => daysSince(r.created_at) >= 4)
  const activeVehicles = ctx.veiculos.filter((v) => v.status === "active").length
  const maintenanceFlags = vehiclesNeedingMaintenance(ctx)

  const attentionText =
    attention.length > 0
      ? `${attention.length} pedem atenção (abertas há 2 dias ou mais)${critical.length > 0 ? `, sendo ${critical.length} crítica${critical.length === 1 ? "" : "s"} (4+ dias)` : ""}.`
      : "Nenhuma está parada há mais de 2 dias — bom ritmo."
  const fleetText =
    maintenanceFlags.length > 0
      ? `Também identifiquei ${maintenanceFlags.length} veículo(s) pedindo atenção da manutenção.`
      : "A frota está com a manutenção em dia."

  return {
    text: `Panorama da operação agora: ${active.length} solicitações em andamento e ${deliveredToday.length} entregues hoje, de ${ctx.solicitacoes.length} solicitações na base. ${attentionText} ${fleetText}`,
    stats: [
      { label: "Veículos ativos", value: String(activeVehicles) },
      { label: "Em andamento", value: String(active.length) },
      { label: "Entregues hoje", value: String(deliveredToday.length), tone: "success" },
      { label: "Com atenção", value: String(attention.length), tone: attention.length > 0 ? "warning" : "success" },
      { label: "Críticas", value: String(critical.length), tone: critical.length > 0 ? "destructive" : "success" },
    ],
  }
}

function openRequestsAnswer(ctx: AiContext): AiAnswer {
  const active = ctx.solicitacoes.filter((r) => isActiveStatus(r.status))
  const ranked = [...active].sort((a, b) => daysSince(b.created_at) - daysSince(a.created_at))
  const flagged = ranked.filter((r) => daysSince(r.created_at) >= 2)
  const top = ranked.slice(0, 6)

  const text =
    flagged.length === 0
      ? `Todas as ${active.length} solicitações em andamento foram abertas há menos de 2 dias — nenhuma parece parada no momento.`
      : `${flagged.length} de ${active.length} solicitações em andamento estão abertas há 2 dias ou mais. As mais antigas são:`

  if (top.length === 0) return { text: "Não há nenhuma solicitação em andamento no momento." }

  return {
    text,
    items: top.map((r) => ({
      id: r.id,
      title: `#${r.request_number} — ${clienteName(ctx, r.client_id)}`,
      subtitle: `${STATUS_LABELS[r.status]} • aberta ${humanizeOpenSince(r.created_at)} • ${r.driver_id ? motoristaName(ctx, r.driver_id) : "sem motorista atribuído"}`,
      badge: { label: STATUS_LABELS[r.status], variant: STATUS_BADGE_VARIANT[r.status] },
    })),
  }
}

function cancelledRequestsAnswer(ctx: AiContext): AiAnswer {
  const cancelled = ctx.solicitacoes
    .filter((r) => r.status === "cancelada")
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  if (cancelled.length === 0) {
    return { text: "Não há solicitações canceladas na base atual." }
  }

  return {
    text: `${cancelled.length} solicitação(ões) foram canceladas. Os motivos registrados:`,
    items: cancelled.slice(0, 6).map((r) => ({
      id: r.id,
      title: `#${r.request_number} — ${clienteName(ctx, r.client_id)}`,
      subtitle: r.notes ? `Motivo: ${r.notes}` : "Sem motivo registrado",
      meta: formatDate(r.updated_at),
      badge: { label: "Cancelada", variant: "destructive" },
    })),
  }
}

function requestLookupAnswer(ctx: AiContext, requestNumber: number): AiAnswer {
  const r = ctx.solicitacoes.find((x) => x.request_number === requestNumber)
  if (!r) {
    return { text: `Não encontrei a solicitação #${requestNumber} na base atual.` }
  }

  const freight = freightOf(ctx, r)
  const lines = [
    `Solicitação #${r.request_number} — ${clienteName(ctx, r.client_id)}.`,
    `Status: ${STATUS_LABELS[r.status]}, aberta ${humanizeOpenSince(r.created_at)}.`,
    r.driver_id ? `Motorista: ${motoristaName(ctx, r.driver_id)}.` : "Ainda sem motorista atribuído.",
    r.vehicle_id ? `Veículo: ${veiculoPlate(ctx, r.vehicle_id)}.` : "",
    `Frete: ${formatCurrency(freight)}.`,
    r.status === "cancelada" && r.notes ? `Motivo do cancelamento: ${r.notes}` : "",
  ].filter(Boolean)

  return {
    text: lines.join(" "),
    items: [
      {
        id: r.id,
        title: `#${r.request_number}`,
        subtitle: `${STATUS_LABELS[r.status]} • criada em ${formatDate(r.created_at)}`,
        badge: { label: STATUS_LABELS[r.status], variant: STATUS_BADGE_VARIANT[r.status] },
      },
    ],
  }
}

// --- Motoristas -----------------------------------------------------------

function driversOnlineAnswer(ctx: AiContext): AiAnswer {
  const online = ctx.motoristas.filter((m) => isDriverOnline(m.id, ctx.solicitacoes))
  const offline = ctx.motoristas.length - online.length

  if (online.length === 0) {
    return {
      text: `Nenhum motorista está com corrida ativa agora. ${ctx.motoristas.length > 0 ? `Os ${ctx.motoristas.length} motoristas cadastrados estão disponíveis.` : ""}`,
    }
  }

  return {
    text: `${online.length} de ${ctx.motoristas.length} motoristas estão rodando agora. ${offline} disponível(is) para novas corridas.`,
    items: online.map((m) => {
      const current = ctx.solicitacoes.find((r) => r.driver_id === m.id && isActiveStatus(r.status))
      return {
        id: m.id,
        title: m.name,
        subtitle: current ? `#${current.request_number} — ${STATUS_LABELS[current.status]}` : "Em rota",
        badge: { label: "Online", variant: "success" },
      }
    }),
  }
}

function topDriversAnswer(ctx: AiContext): AiAnswer {
  const since = Date.now() - 30 * DAY_MS
  const counts = new Map<string, number>()
  for (const r of ctx.solicitacoes) {
    if (r.status === "entregue" && r.driver_id && r.delivered_at && new Date(r.delivered_at).getTime() >= since) {
      counts.set(r.driver_id, (counts.get(r.driver_id) ?? 0) + 1)
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1])

  if (ranked.length === 0) {
    return { text: "Nenhuma entrega foi concluída nos últimos 30 dias para calcular um ranking." }
  }

  return {
    text: "Ranking de entregas concluídas nos últimos 30 dias:",
    items: ranked.map(([driverId, count], idx) => ({
      id: driverId,
      title: `${idx + 1}º ${motoristaName(ctx, driverId)}`,
      subtitle: `${count} entrega${count === 1 ? "" : "s"} concluída${count === 1 ? "" : "s"}`,
    })),
  }
}

function cnhAnswer(ctx: AiContext): AiAnswer {
  const withDays = ctx.motoristas.map((m) => ({ m, days: daysUntil(m.cnh_valid_until) }))
  const risky = withDays.filter((x) => x.days <= 30).sort((a, b) => a.days - b.days)

  if (risky.length === 0) {
    return { text: "Todas as CNHs estão em dia — nenhuma vence nos próximos 30 dias." }
  }

  return {
    text: `${risky.length} motorista(s) com CNH vencendo em até 30 dias:`,
    items: risky.map(({ m, days }) => ({
      id: m.id,
      title: m.name,
      subtitle:
        days < 0
          ? `CNH vencida há ${Math.abs(days)} dia(s) (${formatDate(m.cnh_valid_until)})`
          : `Vence em ${days} dia(s) (${formatDate(m.cnh_valid_until)})`,
      badge: { label: days < 0 ? "Vencida" : "Atenção", variant: days < 0 ? "destructive" : "warning" },
    })),
  }
}

function driverLookupAnswer(ctx: AiContext, driver: Motorista): AiAnswer {
  const own = ctx.solicitacoes.filter((r) => r.driver_id === driver.id)
  const delivered = own.filter((r) => r.status === "entregue")
  const active = own.filter((r) => isActiveStatus(r.status))
  const online = isDriverOnline(driver.id, ctx.solicitacoes)
  const totalFreight = delivered.reduce((sum, r) => sum + freightOf(ctx, r), 0)

  return {
    text: `${driver.name} já teve ${own.length} corrida(s) atribuída(s): ${delivered.length} entregue(s) (${formatCurrency(totalFreight)} em frete) e ${active.length} em andamento agora. Status atual: ${online ? "rodando" : "disponível"}.`,
  }
}

// --- Frota -----------------------------------------------------------

function currentKmByVehicle(ctx: AiContext): Map<string, number> {
  const map = new Map<string, number>()
  const bump = (vehicleId: string, km: number) => {
    if (km > (map.get(vehicleId) ?? 0)) map.set(vehicleId, km)
  }
  for (const log of ctx.combustivel) bump(log.vehicle_id, log.km_final)
  for (const m of ctx.manutencao) bump(m.vehicle_id, m.current_km)
  for (const c of ctx.checklists) bump(c.vehicle_id, c.current_km)
  return map
}

function latestOilByVehicle(ctx: AiContext): Map<string, TrocaDeOleo> {
  const map = new Map<string, TrocaDeOleo>()
  for (const o of ctx.oleo) {
    const prev = map.get(o.vehicle_id)
    if (!prev || new Date(o.change_date) > new Date(prev.change_date)) map.set(o.vehicle_id, o)
  }
  return map
}

function maintenanceAnswer(ctx: AiContext): AiAnswer {
  const kmByVehicle = currentKmByVehicle(ctx)
  const oilByVehicle = latestOilByVehicle(ctx)
  const items: AiResultItem[] = []

  for (const v of ctx.veiculos) {
    if (v.status === "maintenance") {
      items.push({
        id: v.id,
        title: v.plate,
        subtitle: `${v.brand} ${v.model} • em manutenção agora`,
        badge: { label: "Em manutenção", variant: "warning" },
      })
      continue
    }

    const oil = oilByVehicle.get(v.id)
    const km = kmByVehicle.get(v.id)
    if (!oil || km == null) continue

    const over = km - oil.next_change_km
    if (over >= 0) {
      items.push({
        id: v.id,
        title: v.plate,
        subtitle: `${v.brand} ${v.model} • troca de óleo vencida (rodou ${over.toLocaleString("pt-BR")} km além do previsto)`,
        badge: { label: "Vencida", variant: "destructive" },
      })
    } else if (over >= -1000) {
      items.push({
        id: v.id,
        title: v.plate,
        subtitle: `${v.brand} ${v.model} • próximo da troca de óleo (faltam ${Math.abs(over).toLocaleString("pt-BR")} km)`,
        badge: { label: "Atenção", variant: "warning" },
      })
    }
  }

  if (items.length === 0) {
    return { text: "Frota em dia: nenhum veículo em manutenção ou com troca de óleo vencida/próxima." }
  }

  return { text: `Encontrei ${items.length} veículo(s) que pedem atenção da manutenção:`, items }
}

function fuelAnswer(ctx: AiContext): AiAnswer {
  const now = new Date()
  const monthLogs = ctx.combustivel.filter((l) => isSameMonth(new Date(l.log_date), now))

  if (monthLogs.length === 0) {
    return { text: "Nenhum abastecimento foi registrado este mês." }
  }

  const byVehicle = new Map<string, { liters: number; cost: number }>()
  for (const l of monthLogs) {
    const cur = byVehicle.get(l.vehicle_id) ?? { liters: 0, cost: 0 }
    cur.liters += l.liters
    cur.cost += l.liters * l.fuel_price
    byVehicle.set(l.vehicle_id, cur)
  }
  const ranked = [...byVehicle.entries()].sort((a, b) => b[1].cost - a[1].cost)
  const totalCost = ranked.reduce((sum, [, v]) => sum + v.cost, 0)

  return {
    text: `Este mês a frota gastou ${formatCurrency(totalCost)} em combustível. Os maiores consumidores:`,
    items: ranked.slice(0, 5).map(([vehicleId, data]) => ({
      id: vehicleId,
      title: veiculoPlate(ctx, vehicleId),
      subtitle: `${data.liters.toFixed(0)} litros`,
      meta: formatCurrency(data.cost),
    })),
  }
}

function checklistProblemsAnswer(ctx: AiContext): AiAnswer {
  const since = Date.now() - 30 * DAY_MS
  const recent = ctx.checklists.filter((c) => new Date(c.checklist_date).getTime() >= since)
  const flagged: AiResultItem[] = []

  for (const c of recent) {
    const failed = [...c.materiais, ...c.veiculo].filter((i) => i.status === "nao")
    if (failed.length === 0) continue
    flagged.push({
      id: c.id,
      title: `${c.vehicle_plate} — ${formatDate(c.checklist_date)}`,
      subtitle: failed.map((i) => i.label).join(", "),
      badge: { label: `${failed.length} item${failed.length === 1 ? "" : "s"}`, variant: "warning" },
    })
  }

  if (flagged.length === 0) {
    return { text: "Nenhum checklist dos últimos 30 dias reportou item reprovado." }
  }

  return { text: `${flagged.length} checklist(s) recentes reportaram itens reprovados:`, items: flagged }
}

// --- Financeiro -----------------------------------------------------------

function revenueAnswer(ctx: AiContext, timeframe: "semana" | "mes"): AiAnswer {
  const now = Date.now()
  const rangeMs = (timeframe === "semana" ? 7 : 30) * DAY_MS
  const delivered = ctx.solicitacoes.filter(
    (r) => r.status === "entregue" && r.delivered_at && now - new Date(r.delivered_at).getTime() <= rangeMs,
  )
  const total = delivered.reduce((sum, r) => sum + freightOf(ctx, r), 0)
  const avg = delivered.length > 0 ? total / delivered.length : 0
  const label = timeframe === "semana" ? "últimos 7 dias" : "últimos 30 dias"

  return {
    text: `Faturamento nos ${label}: ${formatCurrency(total)}, com ${delivered.length} entrega(s) concluída(s) e ticket médio de ${formatCurrency(avg)}.`,
    stats: [
      { label: "Faturamento", value: formatCurrency(total) },
      { label: "Entregas", value: String(delivered.length) },
      { label: "Ticket médio", value: formatCurrency(avg) },
    ],
  }
}

function topClientsAnswer(ctx: AiContext): AiAnswer {
  const byClient = new Map<string, { count: number; total: number }>()
  for (const r of ctx.solicitacoes) {
    if (r.status !== "entregue") continue
    const cur = byClient.get(r.client_id) ?? { count: 0, total: 0 }
    cur.count += 1
    cur.total += freightOf(ctx, r)
    byClient.set(r.client_id, cur)
  }
  const ranked = [...byClient.entries()].sort((a, b) => b[1].total - a[1].total)

  if (ranked.length === 0) {
    return { text: "Ainda não há entregas concluídas para calcular receita por cliente." }
  }

  return {
    text: "Clientes que mais geram receita (entregas concluídas):",
    items: ranked.slice(0, 5).map(([clientId, data]) => ({
      id: clientId,
      title: clienteName(ctx, clientId),
      subtitle: `${data.count} entrega${data.count === 1 ? "" : "s"}`,
      meta: formatCurrency(data.total),
    })),
  }
}

// --- Sugestões (chips) -----------------------------------------------------------

export const SUGGESTED_QUESTIONS: AiQuestion[] = [
  { id: "resumo", category: "Operação", question: "Como está a operação agora?", run: operationalSummary },
  { id: "paradas", category: "Operação", question: "Quais solicitações estão em aberto há mais tempo?", run: openRequestsAnswer },
  { id: "canceladas", category: "Operação", question: "Tivemos cancelamentos recentes? Por quê?", run: cancelledRequestsAnswer },
  { id: "online", category: "Motoristas", question: "Quais motoristas estão rodando agora?", run: driversOnlineAnswer },
  { id: "ranking-motoristas", category: "Motoristas", question: "Qual motorista mais entregou nos últimos 30 dias?", run: topDriversAnswer },
  { id: "cnh", category: "Motoristas", question: "Algum motorista está com a CNH perto de vencer?", run: cnhAnswer },
  { id: "manutencao", category: "Frota", question: "Algum veículo precisa de manutenção ou troca de óleo?", run: maintenanceAnswer },
  { id: "combustivel", category: "Frota", question: "Qual veículo consumiu mais combustível este mês?", run: fuelAnswer },
  { id: "checklist", category: "Frota", question: "Algum checklist encontrou problema recente?", run: checklistProblemsAnswer },
  { id: "faturamento-semana", category: "Financeiro", question: "Quanto faturamos nos últimos 7 dias?", run: (ctx) => revenueAnswer(ctx, "semana") },
  { id: "faturamento-mes", category: "Financeiro", question: "Quanto faturamos nos últimos 30 dias?", run: (ctx) => revenueAnswer(ctx, "mes") },
  { id: "top-clientes", category: "Financeiro", question: "Quais clientes mais geram receita?", run: topClientsAnswer },
]

// --- Roteador de texto livre -----------------------------------------------------------

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
}

interface Intent {
  match: (t: string) => boolean
  run: (ctx: AiContext) => AiAnswer
}

const INTENTS: Intent[] = [
  { match: (t) => t.includes("cnh") || t.includes("habilitacao"), run: cnhAnswer },
  { match: (t) => t.includes("checklist") || t.includes("reprovado"), run: checklistProblemsAnswer },
  { match: (t) => t.includes("oleo") || t.includes("manutencao") || t.includes("revisao"), run: maintenanceAnswer },
  { match: (t) => t.includes("combustivel") || t.includes("abasteci") || t.includes("litro"), run: fuelAnswer },
  { match: (t) => t.includes("cancelad"), run: cancelledRequestsAnswer },
  {
    match: (t) => (t.includes("fatur") || t.includes("receita")) && t.includes("semana"),
    run: (ctx) => revenueAnswer(ctx, "semana"),
  },
  {
    match: (t) => (t.includes("fatur") || t.includes("receita")) && t.includes("mes"),
    run: (ctx) => revenueAnswer(ctx, "mes"),
  },
  {
    match: (t) => t.includes("cliente") && (t.includes("mais") || t.includes("fatur") || t.includes("receita")),
    run: topClientsAnswer,
  },
  { match: (t) => t.includes("fatur") || t.includes("receita"), run: (ctx) => revenueAnswer(ctx, "mes") },
  { match: (t) => t.includes("online") || t.includes("rodando") || t.includes("disponivel"), run: driversOnlineAnswer },
  {
    match: (t) => t.includes("mais entreg") || t.includes("ranking") || t.includes("produtiv") || t.includes("desempenho"),
    run: topDriversAnswer,
  },
  {
    match: (t) => t.includes("parada") || t.includes("aberto ha") || t.includes("atencao") || t.includes("atrasad") || t.includes("risco"),
    run: openRequestsAnswer,
  },
  {
    match: (t) => t.includes("resumo") || t.includes("panorama") || t.includes("visao geral") || t.includes("central de intelig") || t.includes("como esta a operacao"),
    run: operationalSummary,
  },
]

export function answerFreeText(raw: string, ctx: AiContext): AiAnswer {
  const trimmedRaw = raw.trim()
  const t = normalize(trimmedRaw)

  if (!t) {
    return { text: "Pode perguntar sobre solicitações, motoristas, frota ou financeiro — ou escolher uma sugestão abaixo." }
  }

  const bareNumberMatch = trimmedRaw.match(/^#?\s*(\d{3,6})$/)
  if (bareNumberMatch) {
    return requestLookupAnswer(ctx, Number(bareNumberMatch[1]))
  }
  const contextualNumberMatch = trimmedRaw.match(/#\s*(\d{3,6})/) ?? trimmedRaw.match(/(\d{3,6})/)
  if (contextualNumberMatch && (t.includes("solicita") || t.includes("pedido") || t.includes("entrega") || trimmedRaw.includes("#"))) {
    return requestLookupAnswer(ctx, Number(contextualNumberMatch[1]))
  }

  const mentionedDriver = ctx.motoristas.find((m) => t.includes(normalize(m.name.split(" ")[0])))
  if (mentionedDriver && (t.includes("corrida") || t.includes("entreg") || t.includes("quantas") || t.includes("produtiv") || t.includes("desempenho"))) {
    return driverLookupAnswer(ctx, mentionedDriver)
  }

  for (const intent of INTENTS) {
    if (intent.match(t)) return intent.run(ctx)
  }

  return {
    text: "Ainda não sei responder isso com os dados que tenho — mas posso ajudar com solicitações em aberto, motoristas, manutenção da frota ou faturamento. Tente uma das sugestões abaixo, ou pergunte por um número de solicitação, por exemplo “status da #1025”.",
  }
}
