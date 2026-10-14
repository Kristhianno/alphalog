import { formatCurrency } from "@/lib/format"

/**
 * Fechamentos por veículo lançados pelo gestor (caderno + histórico do rastreador). Não vêm
 * do seed: são números reais da operação, então ficam fixos aqui até existir a tela de fechamento.
 */
export interface VehicleReport {
  vehicle: string
  plate: string
  kind: "semana" | "mes"
  label: string
  runs: number
  revenue: number
  km: number
  /** diária do motorista (valor por dia trabalhado) */
  driverDaily: number
  fuel: number
  /** média de consumo, km/l */
  avgKmL: number
  maintenance?: number
}

export const VEHICLE_REPORTS: VehicleReport[] = [
  {
    vehicle: "Fiorino 59",
    plate: "MGE9159",
    kind: "semana",
    label: "semana de 07/09 a 11/09",
    runs: 16,
    revenue: 918,
    km: 363,
    driverDaily: 136.36,
    fuel: 146.91,
    avgKmL: 10.38,
  },
  {
    vehicle: "Fiorino 59",
    plate: "MGE9159",
    kind: "mes",
    label: "mês de setembro",
    runs: 77,
    revenue: 5709.5,
    km: 2126,
    driverDaily: 136.36,
    fuel: 856.28,
    avgKmL: 11.64,
    maintenance: 631,
  },
]

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

const km = (n: number) => `${n.toLocaleString("pt-BR")} km`
const perKm = (value: number, distance: number) => `${formatCurrency(value / distance)}/km`

export function formatVehicleReport(r: VehicleReport): string {
  return [
    `🚐 *${r.vehicle}* (${r.plate}) — ${r.label}`,
    `• Corridas: *${r.runs}*`,
    `• Faturamento: *${formatCurrency(r.revenue)}* (${formatCurrency(r.revenue / r.runs)} por corrida · ${perKm(r.revenue, r.km)})`,
    `• KM percorrido: *${km(r.km)}*`,
    `• Combustível: *${formatCurrency(r.fuel)}* (${perKm(r.fuel, r.km)} · ${Math.round((r.fuel / r.revenue) * 100)}% do faturamento)`,
    `• Média de consumo: *${r.avgKmL.toLocaleString("pt-BR")} km/l*`,
    r.maintenance != null ? `• Manutenção: *${formatCurrency(r.maintenance)}*` : undefined,
    `• Diária do motorista: *${formatCurrency(r.driverDaily)}*`,
  ]
    .filter(Boolean)
    .join("\n")
}

/** Filtra por veículo (nome ou placa, parcial) e período ("semana" | "mes"); sem filtro, devolve tudo. */
export function findVehicleReports(veiculo?: string, periodo?: string): VehicleReport[] {
  const v = veiculo ? normalize(veiculo) : ""
  const p = periodo ? normalize(periodo) : ""
  const kind = p.startsWith("sem") ? "semana" : p.startsWith("mes") || p.startsWith("set") ? "mes" : undefined
  return VEHICLE_REPORTS.filter(
    (r) =>
      (!v || normalize(r.vehicle).includes(v) || normalize(r.plate).includes(v) || v.includes(normalize(r.plate))) &&
      (!kind || r.kind === kind),
  )
}
