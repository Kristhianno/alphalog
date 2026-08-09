import * as React from "react"
import { AlertTriangle, FileDown, Warehouse } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useVeiculosList } from "@/hooks/useVeiculos"
import { useCombustivelList } from "@/hooks/useCombustivel"
import { useTrocasDeOleoList } from "@/hooks/useOleo"
import { useRegistrosManutencaoList } from "@/hooks/useManutencao"
import { useSolicitacoesList } from "@/hooks/useSolicitacoes"
import { usePrecosList } from "@/hooks/usePrecos"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { VehicleDetailDialog } from "./VehicleDetailDialog"
import { buildCostByVehicle, buildFreightByVehicle, buildVolumeByTypeOverTime } from "./vehicleAnalytics"
import { exportFleetPdf } from "./exportFleetPdf"
import { deriveCurrentKm, isOilChangeOverdue } from "@/domain/vehicleKm"
import { FUEL_TYPE_LABELS, VEHICLE_TYPE_LABELS } from "@/lib/constants"
import { formatCurrency, formatKm } from "@/lib/format"
import { FUEL_TYPES, VEHICLE_TYPES, type FuelType, type VehicleType } from "@/types/enums"
import type { LogCombustivel, RegistroManutencao, TrocaDeOleo, Veiculo } from "@/types/entities"

type TypeFilter = VehicleType | "todos"
type FuelFilter = FuelType | "todos"

function vehicleIndicators(
  vehicle: Veiculo,
  combustivel: LogCombustivel[],
  oleo: TrocaDeOleo[],
  manutencao: RegistroManutencao[],
) {
  const currentKm = deriveCurrentKm({
    vehicleId: vehicle.id,
    fuelLogs: combustivel,
    oilChanges: oleo,
    maintenanceLogs: manutencao,
  })
  const overdue = isOilChangeOverdue({ currentKm, vehicleId: vehicle.id, oilChanges: oleo })
  const latestOil = oleo
    .filter((o) => o.vehicle_id === vehicle.id)
    .sort((a, b) => b.km_at_change - a.km_at_change)[0]
  return { currentKm, overdue, latestOil }
}

const CHART_COLORS = {
  combustivel: "var(--color-chart-1)",
  oleo: "var(--color-chart-2)",
  manutencao: "var(--color-chart-3)",
  frete: "var(--color-chart-1)",
  moto: "var(--color-chart-1)",
  utilitario: "var(--color-chart-2)",
  caminhao_medio: "var(--color-chart-3)",
  caminhao_grande: "var(--color-chart-4)",
}

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--color-popover-foreground)",
}

export function AdminFleetView() {
  const { data: veiculos, isLoading } = useVeiculosList()
  const { data: combustivel } = useCombustivelList()
  const { data: oleo } = useTrocasDeOleoList()
  const { data: manutencao } = useRegistrosManutencaoList()
  const { data: solicitacoes } = useSolicitacoesList()
  const { data: precos } = usePrecosList()

  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("todos")
  const [plateFilter, setPlateFilter] = React.useState("todas")
  const [fuelFilter, setFuelFilter] = React.useState<FuelFilter>("todos")
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")
  const [detailVehicle, setDetailVehicle] = React.useState<Veiculo | undefined>(undefined)

  const inRange = (date: string) => (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo)

  const filteredVeiculos = (veiculos ?? []).filter(
    (v) => (typeFilter === "todos" || v.type === typeFilter) && (plateFilter === "todas" || v.id === plateFilter),
  )
  const filteredVehicleIds = new Set(filteredVeiculos.map((v) => v.id))

  const filteredFuel = (combustivel ?? []).filter(
    (l) =>
      filteredVehicleIds.has(l.vehicle_id) &&
      inRange(l.log_date) &&
      (fuelFilter === "todos" || l.fuel_type === fuelFilter),
  )
  const filteredOil = (oleo ?? []).filter((l) => filteredVehicleIds.has(l.vehicle_id) && inRange(l.change_date))
  const filteredMaintenance = (manutencao ?? []).filter(
    (l) => filteredVehicleIds.has(l.vehicle_id) && inRange(l.maintenance_date),
  )
  const filteredSolicitacoes = (solicitacoes ?? []).filter((r) => inRange(r.created_at.slice(0, 10)))

  const litersTotal = filteredFuel.reduce((sum, l) => sum + l.liters, 0)
  const gastoTotal =
    filteredFuel.reduce((sum, l) => sum + l.liters * l.fuel_price, 0) +
    filteredOil.reduce((sum, l) => sum + l.service_cost, 0) +
    filteredMaintenance.reduce((sum, l) => sum + l.service_cost, 0)
  const kmTotal = filteredFuel.reduce((sum, l) => sum + Math.max(0, l.km_final - l.km_initial), 0)
  const consumoMedio = litersTotal > 0 ? kmTotal / litersTotal : 0

  const overdueCount = filteredVeiculos.filter((v) => {
    const currentKm = deriveCurrentKm({
      vehicleId: v.id,
      fuelLogs: combustivel ?? [],
      oilChanges: oleo ?? [],
      maintenanceLogs: manutencao ?? [],
    })
    return isOilChangeOverdue({ currentKm, vehicleId: v.id, oilChanges: oleo ?? [] })
  }).length

  const costData = buildCostByVehicle(filteredVeiculos, filteredFuel, filteredOil, filteredMaintenance)
  const freightData = buildFreightByVehicle(filteredVeiculos, filteredSolicitacoes, precos ?? [])
  const volumeData = buildVolumeByTypeOverTime(filteredSolicitacoes)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {VEHICLE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {VEHICLE_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={plateFilter} onValueChange={setPlateFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as placas</SelectItem>
            {(veiculos ?? []).map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.plate}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={fuelFilter} onValueChange={(v) => setFuelFilter(v as FuelFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os combustíveis</SelectItem>
            {FUEL_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {FUEL_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" className="w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span className="text-sm text-muted-foreground">até</span>
        <Input type="date" className="w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        {(typeFilter !== "todos" || plateFilter !== "todas" || fuelFilter !== "todos" || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTypeFilter("todos")
              setPlateFilter("todas")
              setFuelFilter("todos")
              setDateFrom("")
              setDateTo("")
            }}
          >
            Limpar filtros
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportFleetPdf({
              veiculos: filteredVeiculos,
              combustivel: filteredFuel,
              oleo: filteredOil,
              manutencao: filteredMaintenance,
            })
          }
          disabled={filteredVeiculos.length === 0}
        >
          <FileDown />
          Exportar PDF da frota
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Veículos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{filteredVeiculos.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Litros totais</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{litersTotal.toFixed(0)} L</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Gasto total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(gastoTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Consumo médio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{consumoMedio.toFixed(1)} km/L</p>
          </CardContent>
        </Card>
        <Card className={overdueCount > 0 ? "border-destructive" : undefined}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Óleo vencido</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <p className="text-2xl font-semibold">{overdueCount}</p>
            {overdueCount > 0 && <AlertTriangle className="size-5 text-destructive" />}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <p className="mb-3 text-sm font-medium">Custo por veículo</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={costData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="plate" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(Number(value))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="combustivel" name="Combustível" stackId="cost" fill={CHART_COLORS.combustivel} radius={[0, 0, 0, 0]} maxBarSize={36} />
              <Bar dataKey="oleo" name="Óleo" stackId="cost" fill={CHART_COLORS.oleo} maxBarSize={36} />
              <Bar dataKey="manutencao" name="Manutenção" stackId="cost" fill={CHART_COLORS.manutencao} radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <p className="mb-3 text-sm font-medium">Frete gerado por veículo</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={freightData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="plate" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={50} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="frete" name="Frete" fill={CHART_COLORS.frete} radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <p className="mb-3 text-sm font-medium">Volume de solicitações por tipo de veículo</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value: string) => VEHICLE_TYPE_LABELS[value as VehicleType] ?? value} />
              {VEHICLE_TYPES.map((type) => (
                <Line
                  key={type}
                  type="monotone"
                  dataKey={type}
                  name={type}
                  stroke={CHART_COLORS[type]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filteredVeiculos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <Warehouse className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum veículo encontrado.</p>
        </div>
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>KM atual</TableHead>
                  <TableHead>Próxima troca</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVeiculos.map((v) => {
                  const { currentKm, overdue, latestOil } = vehicleIndicators(v, combustivel ?? [], oleo ?? [], manutencao ?? [])
                  return (
                    <TableRow key={v.id} className="cursor-pointer" onClick={() => setDetailVehicle(v)}>
                      <TableCell className="font-medium">{v.plate}</TableCell>
                      <TableCell className="text-muted-foreground">{VEHICLE_TYPE_LABELS[v.type]}</TableCell>
                      <TableCell>{formatKm(currentKm)}</TableCell>
                      <TableCell>{latestOil ? formatKm(latestOil.next_change_km) : "—"}</TableCell>
                      <TableCell>
                        {overdue ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                            <AlertTriangle className="size-3.5" /> Óleo vencido
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Em dia</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDetailVehicle(v) }}>
                          Ver histórico
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>

          <div className="space-y-2.5 md:hidden">
            {filteredVeiculos.map((v) => {
              const { currentKm, overdue, latestOil } = vehicleIndicators(v, combustivel ?? [], oleo ?? [], manutencao ?? [])
              return (
                <Card
                  key={v.id}
                  className={overdue ? "border-destructive p-4" : "p-4"}
                  onClick={() => setDetailVehicle(v)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{v.plate}</p>
                      <p className="text-xs text-muted-foreground">{VEHICLE_TYPE_LABELS[v.type]}</p>
                    </div>
                    {overdue ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                        <AlertTriangle className="size-3.5" /> Óleo vencido
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Em dia</span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>KM atual: {formatKm(currentKm)}</span>
                    <span>Próxima troca: {latestOil ? formatKm(latestOil.next_change_km) : "—"}</span>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <VehicleDetailDialog veiculo={detailVehicle} open={!!detailVehicle} onOpenChange={(open) => !open && setDetailVehicle(undefined)} />
    </div>
  )
}