import { FileDown } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCombustivelList } from "@/hooks/useCombustivel"
import { useTrocasDeOleoList } from "@/hooks/useOleo"
import { useRegistrosManutencaoList } from "@/hooks/useManutencao"
import { useChecklistsList } from "@/hooks/useChecklists"
import { totalNegativeAnswers } from "@/domain/checklist"
import { exportVehiclePdf } from "./exportVehiclePdf"
import { FUEL_TYPE_LABELS, MAINTENANCE_TYPE_LABELS } from "@/lib/constants"
import { formatCurrency, formatDate, formatKm } from "@/lib/format"
import type {
  ChecklistVeiculo,
  LogCombustivel,
  RegistroManutencao,
  TrocaDeOleo,
  Veiculo,
} from "@/types/entities"

interface VehicleDetailDialogProps {
  veiculo: Veiculo | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VehicleDetailDialog({ veiculo, onOpenChange }: VehicleDetailDialogProps) {
  const { data: combustivel } = useCombustivelList()
  const { data: oleo } = useTrocasDeOleoList()
  const { data: manutencao } = useRegistrosManutencaoList()
  const { data: checklists } = useChecklistsList()

  const fuel = (combustivel ?? []).filter((l) => l.vehicle_id === veiculo?.id)
  const oilChanges = (oleo ?? []).filter((l) => l.vehicle_id === veiculo?.id)
  const maintenance = (manutencao ?? []).filter((l) => l.vehicle_id === veiculo?.id)
  const checklistLogs = (checklists ?? []).filter((l) => l.vehicle_id === veiculo?.id)

  return (
    <Dialog open={!!veiculo} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {veiculo?.plate} — {veiculo?.brand} {veiculo?.model}
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="combustivel">
          <TabsList>
            <TabsTrigger value="combustivel">Abastecimento</TabsTrigger>
            <TabsTrigger value="oleo">Óleo</TabsTrigger>
            <TabsTrigger value="manutencao">Manutenção</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
          </TabsList>

          <TabsContent value="combustivel" className="max-h-96 overflow-y-auto">
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Combustível</TableHead>
                  <TableHead>Litros</TableHead>
                  <TableHead>Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fuel.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum registro.</TableCell></TableRow>
                ) : (
                  fuel.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{formatDate(l.log_date)}</TableCell>
                      <TableCell className="text-muted-foreground">{FUEL_TYPE_LABELS[l.fuel_type]}</TableCell>
                      <TableCell>{l.liters.toFixed(1)} L</TableCell>
                      <TableCell>{formatCurrency(l.liters * l.fuel_price)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <FuelCardList records={fuel} />
          </TabsContent>

          <TabsContent value="oleo" className="max-h-96 overflow-y-auto">
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>KM troca</TableHead>
                  <TableHead>Próxima</TableHead>
                  <TableHead>Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {oilChanges.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum registro.</TableCell></TableRow>
                ) : (
                  oilChanges.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{formatDate(l.change_date)}</TableCell>
                      <TableCell>{formatKm(l.km_at_change)}</TableCell>
                      <TableCell>{formatKm(l.next_change_km)}</TableCell>
                      <TableCell>{formatCurrency(l.service_cost)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <OilCardList records={oilChanges} />
          </TabsContent>

          <TabsContent value="manutencao" className="max-h-96 overflow-y-auto">
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>KM</TableHead>
                  <TableHead>Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenance.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum registro.</TableCell></TableRow>
                ) : (
                  maintenance.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{formatDate(l.maintenance_date)}</TableCell>
                      <TableCell className="text-muted-foreground">{MAINTENANCE_TYPE_LABELS[l.maintenance_type]}</TableCell>
                      <TableCell>{formatKm(l.current_km)}</TableCell>
                      <TableCell>{formatCurrency(l.service_cost)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <MaintenanceCardList records={maintenance} />
          </TabsContent>

          <TabsContent value="checklist" className="max-h-96 overflow-y-auto">
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>KM</TableHead>
                  <TableHead>Itens "Não"</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checklistLogs.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum registro.</TableCell></TableRow>
                ) : (
                  checklistLogs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{formatDate(l.checklist_date)}</TableCell>
                      <TableCell>{formatKm(l.current_km)}</TableCell>
                      <TableCell>
                        {totalNegativeAnswers(l) > 0 ? (
                          <Badge variant="destructive">{totalNegativeAnswers(l)}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <ChecklistCardList records={checklistLogs} />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              veiculo &&
              exportVehiclePdf({
                veiculo,
                combustivel: fuel,
                oleo: oilChanges,
                manutencao: maintenance,
                checklists: checklistLogs,
              })
            }
          >
            <FileDown />
            Exportar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EmptyOrList<T>({ records, render }: { records: T[]; render: (record: T) => React.ReactNode }) {
  if (records.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Nenhum registro.</p>
  }
  return <div className="space-y-2 md:hidden">{records.map(render)}</div>
}

function FuelCardList({ records }: { records: LogCombustivel[] }) {
  return (
    <EmptyOrList
      records={records}
      render={(l) => (
        <Card key={l.id} className="p-3 text-sm">
          <p className="font-medium">{formatDate(l.log_date)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {FUEL_TYPE_LABELS[l.fuel_type]} · {l.liters.toFixed(1)} L · {formatCurrency(l.liters * l.fuel_price)}
          </p>
        </Card>
      )}
    />
  )
}

function OilCardList({ records }: { records: TrocaDeOleo[] }) {
  return (
    <EmptyOrList
      records={records}
      render={(l) => (
        <Card key={l.id} className="p-3 text-sm">
          <p className="font-medium">{formatDate(l.change_date)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatKm(l.km_at_change)} → {formatKm(l.next_change_km)} · {formatCurrency(l.service_cost)}
          </p>
        </Card>
      )}
    />
  )
}

function MaintenanceCardList({ records }: { records: RegistroManutencao[] }) {
  return (
    <EmptyOrList
      records={records}
      render={(l) => (
        <Card key={l.id} className="p-3 text-sm">
          <p className="font-medium">{formatDate(l.maintenance_date)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {MAINTENANCE_TYPE_LABELS[l.maintenance_type]} · {formatKm(l.current_km)} · {formatCurrency(l.service_cost)}
          </p>
        </Card>
      )}
    />
  )
}

function ChecklistCardList({ records }: { records: ChecklistVeiculo[] }) {
  return (
    <EmptyOrList
      records={records}
      render={(l) => {
        const negatives = totalNegativeAnswers(l)
        return (
          <Card key={l.id} className="flex items-center justify-between p-3 text-sm">
            <div>
              <p className="font-medium">{formatDate(l.checklist_date)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatKm(l.current_km)}</p>
            </div>
            {negatives > 0 ? (
              <Badge variant="destructive">{negatives}</Badge>
            ) : (
              <span className="text-xs text-muted-foreground">0 "Não"</span>
            )}
          </Card>
        )
      }}
    />
  )
}