import { formatCurrency } from "@/lib/format"

/**
 * Fechamentos por veículo (semana de 07/09 a 11/09 e setembro). A Fiorino 59 segue os números do
 * caderno do gestor; os demais são fictícios, com as placas da frota do seed. Placas todas
 * fictícias — ficam fixos aqui até existir a tela de fechamento.
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
    plate: "SPG5J59",
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
    plate: "SPG5J59",
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
  {
    vehicle: "Moto CG 23",
    plate: "RIO1A23",
    kind: "semana",
    label: "semana de 07/09 a 11/09",
    runs: 28,
    revenue: 1215.5,
    km: 412,
    driverDaily: 100,
    fuel: 66.41,
    avgKmL: 38.4,
  },
  {
    vehicle: "Moto CG 23",
    plate: "RIO1A23",
    kind: "mes",
    label: "mês de setembro",
    runs: 117,
    revenue: 5069,
    km: 1748,
    driverDaily: 100,
    fuel: 285.49,
    avgKmL: 37.9,
    maintenance: 185,
  },
  {
    vehicle: "Moto Factor 34",
    plate: "RIO2B34",
    kind: "mes",
    label: "mês de setembro",
    runs: 58,
    revenue: 2491,
    km: 874,
    driverDaily: 100,
    fuel: 133.25,
    avgKmL: 40.6,
    maintenance: 742,
  },
  {
    vehicle: "Fiorino 45",
    plate: "SPA3C45",
    kind: "semana",
    label: "semana de 07/09 a 11/09",
    runs: 19,
    revenue: 1078.5,
    km: 398,
    driverDaily: 136.36,
    fuel: 161.08,
    avgKmL: 10.6,
  },
  {
    vehicle: "Fiorino 45",
    plate: "SPA3C45",
    kind: "mes",
    label: "mês de setembro",
    runs: 82,
    revenue: 5845,
    km: 2214,
    driverDaily: 136.36,
    fuel: 855.68,
    avgKmL: 11.1,
    maintenance: 395,
  },
  {
    vehicle: "Kangoo 56",
    plate: "SPB4D56",
    kind: "semana",
    label: "semana de 07/09 a 11/09",
    runs: 14,
    revenue: 845.5,
    km: 341,
    driverDaily: 136.36,
    fuel: 149.27,
    avgKmL: 9.8,
  },
  {
    vehicle: "Kangoo 56",
    plate: "SPB4D56",
    kind: "mes",
    label: "mês de setembro",
    runs: 66,
    revenue: 4780.5,
    km: 1897,
    driverDaily: 136.36,
    fuel: 797.86,
    avgKmL: 10.2,
  },
  {
    vehicle: "Delivery 67",
    plate: "SPC5E67",
    kind: "semana",
    label: "semana de 07/09 a 11/09",
    runs: 9,
    revenue: 2245.5,
    km: 486,
    driverDaily: 181.82,
    fuel: 515.84,
    avgKmL: 5.7,
  },
  {
    vehicle: "Delivery 67",
    plate: "SPC5E67",
    kind: "mes",
    label: "mês de setembro",
    runs: 41,
    revenue: 9332,
    km: 2051,
    driverDaily: 181.82,
    fuel: 2103.14,
    avgKmL: 5.9,
    maintenance: 1240,
  },
  {
    vehicle: "Atego 89",
    plate: "SPE7G89",
    kind: "semana",
    label: "semana de 07/09 a 11/09",
    runs: 5,
    revenue: 4498,
    km: 612,
    driverDaily: 227.27,
    fuel: 1122,
    avgKmL: 3.3,
  },
  {
    vehicle: "Atego 89",
    plate: "SPE7G89",
    kind: "mes",
    label: "mês de setembro",
    runs: 23,
    revenue: 20628,
    km: 2873,
    driverDaily: 227.27,
    fuel: 5112.25,
    avgKmL: 3.4,
    maintenance: 2860,
  },
  {
    vehicle: "Volvo VM 90",
    plate: "SPF8H90",
    kind: "semana",
    label: "semana de 07/09 a 11/09",
    runs: 6,
    revenue: 4362.5,
    km: 574,
    driverDaily: 227.27,
    fuel: 992.2,
    avgKmL: 3.5,
  },
  {
    vehicle: "Volvo VM 90",
    plate: "SPF8H90",
    kind: "mes",
    label: "mês de setembro",
    runs: 25,
    revenue: 19960,
    km: 2690,
    driverDaily: 227.27,
    fuel: 4520.69,
    avgKmL: 3.6,
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

const PERIOD_LABEL = { semana: "semana de 07/09 a 11/09", mes: "mês de setembro" } as const

function periodKind(periodo?: string): VehicleReport["kind"] | undefined {
  const p = periodo ? normalize(periodo) : ""
  return p.startsWith("sem") ? "semana" : p.startsWith("mes") || p.startsWith("set") ? "mes" : undefined
}

/** Primeira palavra do nome ("fiorino", "kangoo", "moto") — "as fiorinos" pega todas. */
const modelWord = (r: VehicleReport) => normalize(r.vehicle.split(" ")[0])

/**
 * Filtra por veículo (nome, placa ou modelo, parcial) e período ("semana" | "mes"). O veículo
 * pode vir dentro de uma frase ("como fechou a fiorino 59?").
 */
export function findVehicleReports(veiculo?: string, periodo?: string): VehicleReport[] {
  const v = veiculo ? normalize(veiculo) : ""
  const kind = periodKind(periodo)
  const inPeriod = VEHICLE_REPORTS.filter((r) => !kind || r.kind === kind)
  if (!v) return inPeriod
  const exact = inPeriod.filter((r) => [normalize(r.vehicle), normalize(r.plate)].some((k) => k.includes(v) || v.includes(k)))
  return exact.length ? exact : inPeriod.filter((r) => v.includes(modelWord(r)))
}

/**
 * Se a frase cita um veículo com fechamento, devolve o filtro a usar (nome, placa ou modelo).
 * O modelo só vale como palavra inteira — "motoristas" não é "moto".
 */
export function vehicleMentioned(text: string): { veiculo: string; byPlate: boolean } | undefined {
  const t = normalize(text)
  const byName = VEHICLE_REPORTS.find((x) => t.includes(normalize(x.vehicle)))
  if (byName) return { veiculo: byName.vehicle, byPlate: false }
  const byPlate = VEHICLE_REPORTS.find((x) => t.includes(normalize(x.plate)))
  if (byPlate) return { veiculo: byPlate.plate, byPlate: true }
  const words = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/)
  const model = VEHICLE_REPORTS.map(modelWord).find((w) => words.includes(w) || words.includes(`${w}s`))
  return model ? { veiculo: model, byPlate: false } : undefined
}

/** Uma linha por veículo + totais — resposta quando o gestor não cita um veículo. */
export function formatFleetSummary(reports: VehicleReport[], periodo?: string): string {
  const kind = periodKind(periodo) ?? "mes"
  const rows = reports.filter((r) => r.kind === kind).sort((a, b) => b.revenue - a.revenue)
  const sum = (f: (r: VehicleReport) => number) => rows.reduce((acc, r) => acc + f(r), 0)
  return [
    `🚚 *Fechamento da frota — ${PERIOD_LABEL[kind]}* (${rows.length} veículos)`,
    ...rows.map(
      (r) => `• *${r.vehicle}* (${r.plate}): ${r.runs} corridas · ${formatCurrency(r.revenue)} · ${km(r.km)} · ${r.avgKmL.toLocaleString("pt-BR")} km/l`,
    ),
    "",
    `Total: *${sum((r) => r.runs)}* corridas · *${formatCurrency(sum((r) => r.revenue))}* · ${km(sum((r) => r.km))} · combustível ${formatCurrency(sum((r) => r.fuel))} · manutenção ${formatCurrency(sum((r) => r.maintenance ?? 0))}`,
    "_Peça o detalhe de um veículo pelo nome ou pela placa._",
  ].join("\n")
}
