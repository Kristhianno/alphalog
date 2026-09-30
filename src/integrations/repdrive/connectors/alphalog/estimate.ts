import type { DB } from "@/mocks/db/schema"
import { haversineKm } from "@/domain/distance"
import { coordinatesFromAddress } from "@/domain/regions"
import type { Solicitacao } from "@/types/entities"
import type { RequestStatus, VehicleType } from "@/types/enums"

/**
 * Previsões de coleta/entrega para a demo. O app ainda não guarda ETA, então derivamos:
 * distância entre as cidades (mesma tabela de coordenadas do app) ÷ velocidade média do tipo
 * de veículo, ancorada no horário real da última mudança de status. É sempre apresentada
 * como estimativa.
 */

const AVG_SPEED_KMH: Record<VehicleType, number> = {
  moto: 35,
  utilitario: 40,
  caminhao_medio: 32,
  caminhao_grande: 28,
}
const HANDLING_MIN = 20
const MIN = 60_000

const AFTER_PICKUP: RequestStatus[] = ["coletada", "em_rota", "pendente_entrega", "entregue"]

export interface Moment {
  at: Date
  /** true quando já aconteceu (horário real), false quando é previsão */
  done: boolean
}

export interface RequestEstimate {
  distanceKm: number
  transitMin: number
  departure?: Moment
  pickup?: Moment
  delivery?: Moment
}

function roundUpTo(date: Date, minutes: number): Date {
  const step = minutes * MIN
  return new Date(Math.ceil(date.getTime() / step) * step)
}

function statusAt(db: DB, r: Solicitacao, status: RequestStatus): Date | undefined {
  const h = db.historicoStatus.find((x) => x.delivery_request_id === r.id && x.status === status)
  return h ? new Date(h.changed_at) : undefined
}

function later(a: Date, b: Date): Date {
  return a.getTime() > b.getTime() ? a : b
}

export function estimateRequest(db: DB, r: Solicitacao, now = new Date()): RequestEstimate {
  const from = coordinatesFromAddress(r.origin_address)
  const to = coordinatesFromAddress(r.destination_address)
  const distanceKm = from && to ? Math.max(5, Math.round(haversineKm(from, to))) : 30
  const transitMin = Math.ceil(((distanceKm / AVG_SPEED_KMH[r.transport_type]) * 60 + HANDLING_MIN) / 5) * 5
  const soon = (min: number) => new Date(now.getTime() + min * MIN)
  const anchored = (status: RequestStatus, plusMin: number, floorMin: number) =>
    roundUpTo(later(new Date((statusAt(db, r, status) ?? now).getTime() + plusMin * MIN), soon(floorMin)), 15)

  const base: RequestEstimate = { distanceKm, transitMin }
  if (r.status === "cancelada") return base

  let pickup: Moment
  if (AFTER_PICKUP.includes(r.status)) {
    pickup = { at: statusAt(db, r, "coletada") ?? new Date(r.updated_at), done: true }
  } else if (r.status === "agendada") {
    const scheduled = r.scheduled_date ? new Date(r.scheduled_date) : soon(24 * 60)
    pickup = { at: roundUpTo(later(scheduled, soon(60)), 15), done: false }
  } else if (r.status === "solicitada") {
    pickup = { at: roundUpTo(soon(120), 15), done: false }
  } else if (r.status === "aceita") {
    pickup = { at: anchored("aceita", 90, 30), done: false }
  } else {
    pickup = { at: anchored("pendente_coleta", 45, 15), done: false }
  }

  let delivery: Moment
  if (r.status === "entregue") {
    delivery = { at: new Date(r.delivered_at ?? r.updated_at), done: true }
  } else if (r.status === "pendente_entrega") {
    delivery = { at: anchored("pendente_entrega", 30, 10), done: false }
  } else if (r.status === "em_rota") {
    delivery = { at: anchored("em_rota", transitMin, 15), done: false }
  } else if (r.status === "coletada") {
    delivery = { at: roundUpTo(later(new Date(pickup.at.getTime() + (30 + transitMin) * MIN), soon(transitMin)), 15), done: false }
  } else {
    delivery = { at: roundUpTo(new Date(pickup.at.getTime() + transitMin * MIN), 15), done: false }
  }

  const departure = pickup.done ? undefined : { at: new Date(pickup.at.getTime() - 30 * MIN), done: false }

  return { ...base, departure, pickup, delivery }
}

const TZ = "America/Sao_Paulo"
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
const hourFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })
const dayFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "short", day: "2-digit", month: "2-digit" })

/** "hoje às 14:30", "amanhã às 09:00", "ontem às 17:15" ou "qua., 02/10 às 10:00" (horário de Brasília). */
export function formatWhen(date: Date, now = new Date()): string {
  const diffDays = Math.round(
    (Date.parse(dayKey.format(date)) - Date.parse(dayKey.format(now))) / (24 * 60 * MIN),
  )
  const hour = hourFmt.format(date)
  if (diffDays === 0) return `hoje às ${hour}`
  if (diffDays === 1) return `amanhã às ${hour}`
  if (diffDays === -1) return `ontem às ${hour}`
  return `${dayFmt.format(date)} às ${hour}`
}

export function isSameDayBR(a: Date, b: Date): boolean {
  return dayKey.format(a) === dayKey.format(b)
}
