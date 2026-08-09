import * as React from "react"
import { AlertTriangle, MoreHorizontal, Plus } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { useVeiculosList } from "@/hooks/useVeiculos"
import { useMotoristasList } from "@/hooks/useMotoristas"
import { useCombustivelList, useDeleteLogCombustivel } from "@/hooks/useCombustivel"
import { useTrocasDeOleoList, useDeleteTrocaDeOleo } from "@/hooks/useOleo"
import { useRegistrosManutencaoList, useDeleteRegistroManutencao } from "@/hooks/useManutencao"
import { useChecklistsList, useDeleteChecklist } from "@/hooks/useChecklists"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { FuelLogDialog } from "./FuelLogDialog"
import { OilChangeDialog } from "./OilChangeDialog"
import { MaintenanceDialog } from "./MaintenanceDialog"
import { ChecklistDialog } from "./ChecklistDialog"
import { deriveCurrentKm, isOilChangeOverdue, latestOilChange } from "@/domain/vehicleKm"
import { totalNegativeAnswers } from "@/domain/checklist"
import { FUEL_TYPE_LABELS, MAINTENANCE_TYPE_LABELS, VEHICLE_TYPE_LABELS } from "@/lib/constants"
import { formatCurrency, formatDate, formatKm } from "@/lib/format"
import { VEHICLE_TYPES, type VehicleType } from "@/types/enums"
import type {
  ChecklistVeiculo,
  LogCombustivel,
  RegistroManutencao,
  TrocaDeOleo,
  Veiculo,
} from "@/types/entities"

type TypeFilter = VehicleType | "todos"

export function DriverVehicleView() {
  const { actor } = useAuth()
  const { data: motoristas, isLoading: loadingMotoristas } = useMotoristasList()
  const { data: veiculos } = useVeiculosList()
  const { data: combustivel } = useCombustivelList()
  const { data: oleo } = useTrocasDeOleoList()
  const { data: manutencao } = useRegistrosManutencaoList()
  const { data: checklists } = useChecklistsList()

  const own = motoristas?.find((m) => m.id === actor?.driverId)
  const ownVehicle = veiculos?.find((v) => v.id === own?.vehicle_id)

  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("todos")
  const [plateFilter, setPlateFilter] = React.useState("todas")
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")

  const [fuelDialogOpen, setFuelDialogOpen] = React.useState(false)
  const [oilDialogOpen, setOilDialogOpen] = React.useState(false)
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = React.useState(false)
  const [checklistDialogOpen, setChecklistDialogOpen] = React.useState(false)

  const [editFuel, setEditFuel] = React.useState<LogCombustivel | undefined>(undefined)
  const [editOil, setEditOil] = React.useState<TrocaDeOleo | undefined>(undefined)
  const [editMaintenance, setEditMaintenance] = React.useState<RegistroManutencao | undefined>(undefined)
  const [editChecklist, setEditChecklist] = React.useState<ChecklistVeiculo | undefined>(undefined)

  if (!loadingMotoristas && !own) {
    return (
      <Alert variant="warning">
        <AlertDescription>
          Seu usuário ainda não está vinculado a um cadastro de motorista. Contate a administração
          para liberar o registro de frota.
        </AlertDescription>
      </Alert>
    )
  }

  const inRange = (date: string) => (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo)
  const matchesVehicle = (vehicleId: string) => {
    if (plateFilter !== "todas" && vehicleId !== plateFilter) return false
    if (typeFilter !== "todos") {
      const vehicle = veiculos?.find((v) => v.id === vehicleId)
      if (vehicle?.type !== typeFilter) return false
    }
    return true
  }

  const filteredFuel = (combustivel ?? []).filter((l) => matchesVehicle(l.vehicle_id) && inRange(l.log_date))
  const filteredOil = (oleo ?? []).filter((l) => matchesVehicle(l.vehicle_id) && inRange(l.change_date))
  const filteredMaintenance = (manutencao ?? []).filter((l) => matchesVehicle(l.vehicle_id) && inRange(l.maintenance_date))
  const filteredChecklists = (checklists ?? []).filter((l) => matchesVehicle(l.vehicle_id) && inRange(l.checklist_date))

  const currentKm = ownVehicle
    ? deriveCurrentKm({
        vehicleId: ownVehicle.id,
        fuelLogs: combustivel ?? [],
        oilChanges: oleo ?? [],
        maintenanceLogs: manutencao ?? [],
      })
    : 0
  const litersInPeriod = filteredFuel.reduce((sum, l) => sum + l.liters, 0)
  const spentFuel = filteredFuel.reduce((sum, l) => sum + l.liters * l.fuel_price, 0)
  const spentOil = filteredOil.reduce((sum, l) => sum + l.service_cost, 0)
  const spentMaintenance = filteredMaintenance.reduce((sum, l) => sum + l.service_cost, 0)
  const totalSpent = spentFuel + spentOil + spentMaintenance

  const nextOil = ownVehicle ? latestOilChange(ownVehicle.id, oleo ?? []) : undefined
  const oilOverdue = ownVehicle
    ? isOilChangeOverdue({ currentKm, vehicleId: ownVehicle.id, oilChanges: oleo ?? [] })
    : false

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">KM atual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{ownVehicle ? formatKm(currentKm) : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Litros no período</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{litersInPeriod.toFixed(1)} L</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Gasto total no período</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(totalSpent)}</p>
          </CardContent>
        </Card>
        <Card className={oilOverdue ? "border-destructive" : undefined}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Próxima troca de óleo</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <p className="text-2xl font-semibold">{nextOil ? formatKm(nextOil.next_change_km) : "—"}</p>
            {oilOverdue && <AlertTriangle className="size-5 text-destructive" />}
          </CardContent>
        </Card>
      </div>

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
        <Input type="date" className="w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span className="text-sm text-muted-foreground">até</span>
        <Input type="date" className="w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => { setEditFuel(undefined); setFuelDialogOpen(true) }}>
          <Plus />
          Abastecimento
        </Button>
        <Button size="sm" onClick={() => { setEditOil(undefined); setOilDialogOpen(true) }}>
          <Plus />
          Troca de óleo
        </Button>
        <Button size="sm" onClick={() => { setEditMaintenance(undefined); setMaintenanceDialogOpen(true) }}>
          <Plus />
          Manutenção
        </Button>
        <Button size="sm" onClick={() => { setEditChecklist(undefined); setChecklistDialogOpen(true) }}>
          <Plus />
          Checklist
        </Button>
      </div>

      <Tabs defaultValue="combustivel">
        <TabsList>
          <TabsTrigger value="combustivel">Abastecimento</TabsTrigger>
          <TabsTrigger value="oleo">Óleo</TabsTrigger>
          <TabsTrigger value="manutencao">Manutenção</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="combustivel">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Combustível</TableHead>
                  <TableHead>Litros</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFuel.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum registro.</TableCell></TableRow>
                ) : (
                  filteredFuel.map((log) => (
                    <FuelRow key={log.id} log={log} onEdit={() => { setEditFuel(log); setFuelDialogOpen(true) }} />
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="oleo">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>KM troca</TableHead>
                  <TableHead>Próxima troca</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOil.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum registro.</TableCell></TableRow>
                ) : (
                  filteredOil.map((log) => (
                    <OilRow key={log.id} log={log} onEdit={() => { setEditOil(log); setOilDialogOpen(true) }} />
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="manutencao">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>KM</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaintenance.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum registro.</TableCell></TableRow>
                ) : (
                  filteredMaintenance.map((log) => (
                    <MaintenanceRow key={log.id} log={log} onEdit={() => { setEditMaintenance(log); setMaintenanceDialogOpen(true) }} />
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="checklist">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>KM</TableHead>
                  <TableHead>Itens "Não"</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChecklists.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum registro.</TableCell></TableRow>
                ) : (
                  filteredChecklists.map((log) => (
                    <ChecklistRow key={log.id} log={log} onEdit={() => { setEditChecklist(log); setChecklistDialogOpen(true) }} />
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <FuelLogDialog
        open={fuelDialogOpen}
        onOpenChange={setFuelDialogOpen}
        veiculos={veiculos ?? []}
        defaultVehicleId={own?.vehicle_id}
        record={editFuel}
      />
      <OilChangeDialog
        open={oilDialogOpen}
        onOpenChange={setOilDialogOpen}
        veiculos={veiculos ?? []}
        defaultVehicleId={own?.vehicle_id}
        record={editOil}
      />
      <MaintenanceDialog
        open={maintenanceDialogOpen}
        onOpenChange={setMaintenanceDialogOpen}
        veiculos={veiculos ?? []}
        defaultVehicleId={own?.vehicle_id}
        record={editMaintenance}
      />
      <ChecklistDialog
        open={checklistDialogOpen}
        onOpenChange={setChecklistDialogOpen}
        veiculos={veiculos ?? []}
        defaultVehicleId={own?.vehicle_id}
        record={editChecklist}
      />
    </div>
  )
}

function FuelRow({ log, onEdit }: { log: LogCombustivel; onEdit: () => void }) {
  const deleteLog = useDeleteLogCombustivel(log.vehicle_id)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  return (
    <TableRow>
      <TableCell>{formatDate(log.log_date)}</TableCell>
      <TableCell>{log.vehicle_plate}</TableCell>
      <TableCell className="text-muted-foreground">{FUEL_TYPE_LABELS[log.fuel_type]}</TableCell>
      <TableCell>{log.liters.toFixed(1)} L</TableCell>
      <TableCell>{formatCurrency(log.liters * log.fuel_price)}</TableCell>
      <TableCell>
        <RowMenu onEdit={onEdit} onDelete={() => setConfirmOpen(true)} />
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Excluir abastecimento"
          confirmLabel="Excluir"
          destructive
          onConfirm={async () => {
            await deleteLog.mutateAsync(log.id)
            toast.success("Registro excluído.")
          }}
        />
      </TableCell>
    </TableRow>
  )
}

function OilRow({ log, onEdit }: { log: TrocaDeOleo; onEdit: () => void }) {
  const deleteLog = useDeleteTrocaDeOleo(log.vehicle_id)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  return (
    <TableRow>
      <TableCell>{formatDate(log.change_date)}</TableCell>
      <TableCell>{log.vehicle_plate}</TableCell>
      <TableCell className="text-muted-foreground">{log.oil_type}</TableCell>
      <TableCell>{formatKm(log.km_at_change)}</TableCell>
      <TableCell>{formatKm(log.next_change_km)}</TableCell>
      <TableCell>{formatCurrency(log.service_cost)}</TableCell>
      <TableCell>
        <RowMenu onEdit={onEdit} onDelete={() => setConfirmOpen(true)} />
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Excluir troca de óleo"
          confirmLabel="Excluir"
          destructive
          onConfirm={async () => {
            await deleteLog.mutateAsync(log.id)
            toast.success("Registro excluído.")
          }}
        />
      </TableCell>
    </TableRow>
  )
}

function MaintenanceRow({ log, onEdit }: { log: RegistroManutencao; onEdit: () => void }) {
  const deleteLog = useDeleteRegistroManutencao(log.vehicle_id)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  return (
    <TableRow>
      <TableCell>{formatDate(log.maintenance_date)}</TableCell>
      <TableCell>{log.vehicle_plate}</TableCell>
      <TableCell className="text-muted-foreground">{MAINTENANCE_TYPE_LABELS[log.maintenance_type]}</TableCell>
      <TableCell>{formatKm(log.current_km)}</TableCell>
      <TableCell>{formatCurrency(log.service_cost)}</TableCell>
      <TableCell>
        <RowMenu onEdit={onEdit} onDelete={() => setConfirmOpen(true)} />
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Excluir manutenção"
          confirmLabel="Excluir"
          destructive
          onConfirm={async () => {
            await deleteLog.mutateAsync(log.id)
            toast.success("Registro excluído.")
          }}
        />
      </TableCell>
    </TableRow>
  )
}

function ChecklistRow({ log, onEdit }: { log: ChecklistVeiculo; onEdit: () => void }) {
  const deleteLog = useDeleteChecklist()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const negatives = totalNegativeAnswers(log)
  return (
    <TableRow>
      <TableCell>{formatDate(log.checklist_date)}</TableCell>
      <TableCell>{log.vehicle_plate}</TableCell>
      <TableCell>{formatKm(log.current_km)}</TableCell>
      <TableCell>
        {negatives > 0 ? <Badge variant="destructive">{negatives}</Badge> : <span className="text-muted-foreground">0</span>}
      </TableCell>
      <TableCell>
        <RowMenu onEdit={onEdit} onDelete={() => setConfirmOpen(true)} />
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Excluir checklist"
          confirmLabel="Excluir"
          destructive
          onConfirm={async () => {
            await deleteLog.mutateAsync(log.id)
            toast.success("Registro excluído.")
          }}
        />
      </TableCell>
    </TableRow>
  )
}

function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ações">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>Editar</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Referenced for type-only import cleanliness.
type _Unused = Veiculo