import * as React from "react"
import { Plus, Search, Truck } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useSolicitacoesList } from "@/hooks/useSolicitacoes"
import { useMotoristasList } from "@/hooks/useMotoristas"
import { useVeiculosList } from "@/hooks/useVeiculos"
import { usePausasAlmocoList } from "@/hooks/usePausasAlmoco"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
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
import { RequestDetailsDialog } from "@/features/requests/RequestDetailsDialog"
import { LunchBreakFormDialog } from "./LunchBreakFormDialog"
import { LunchBreakHistoryTable } from "./LunchBreakHistoryTable"
import { STATUS_BADGE_VARIANT, VEHICLE_TYPE_LABELS } from "@/lib/constants"
import { STATUS_LABELS } from "@/domain/requestStatus"
import { getAvailableRequestsForDriver } from "@/domain/driverAvailability"
import { formatDate } from "@/lib/format"
import { REQUEST_STATUSES, type RequestStatus } from "@/types/enums"

type StatusFilter = RequestStatus | "todos"

export function DriverQueueView() {
  const { actor } = useAuth()
  const { data: motoristas, isLoading: loadingMotoristas } = useMotoristasList()
  const { data: veiculos } = useVeiculosList()
  const { data: solicitacoes, isLoading: loadingSolicitacoes } = useSolicitacoesList()
  const { data: pausas } = usePausasAlmocoList()

  const own = motoristas?.find((m) => m.id === actor?.driverId)

  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("todos")
  const [detailsId, setDetailsId] = React.useState<string | undefined>(undefined)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [lunchFormOpen, setLunchFormOpen] = React.useState(false)

  if (!loadingMotoristas && !own) {
    return (
      <Alert variant="warning">
        <AlertDescription>
          Seu usuário ainda não está vinculado a um cadastro de motorista. Contate a administração
          para liberar o acesso às corridas.
        </AlertDescription>
      </Alert>
    )
  }

  const queue = solicitacoes ?? []
  const availableCount = own ? getAvailableRequestsForDriver(own, queue).length : 0
  const vehicle = veiculos?.find((v) => v.id === own?.vehicle_id)

  const filtered = queue.filter((r) => {
    if (statusFilter !== "todos" && r.status !== statusFilter) return false
    const query = search.trim().toLowerCase()
    if (!query) return true
    return String(r.request_number).includes(query) || r.requester.toLowerCase().includes(query)
  })

  function openDetails(id: string) {
    setDetailsId(id)
    setDetailsOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Disponíveis para você</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{availableCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Tipos habilitados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {own?.enabled_vehicle_types.length
                ? own.enabled_vehicle_types.map((t) => VEHICLE_TYPE_LABELS[t]).join(", ")
                : "Nenhum definido"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Veículo vinculado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{vehicle ? `${vehicle.plate} — ${vehicle.brand} ${vehicle.model}` : "Nenhum vinculado"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou solicitante..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {REQUEST_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loadingSolicitacoes ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <Truck className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma corrida disponível ou em andamento.</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Transporte</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => openDetails(r.id)}>
                  <TableCell className="font-medium">#{r.request_number}</TableCell>
                  <TableCell>{r.requester}</TableCell>
                  <TableCell className="text-muted-foreground">{VEHICLE_TYPE_LABELS[r.transport_type]}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Pausas de almoço</h2>
          <Button size="sm" onClick={() => setLunchFormOpen(true)}>
            <Plus />
            Registrar pausa
          </Button>
        </div>
        <LunchBreakHistoryTable records={pausas ?? []} canEdit />
      </div>

      <RequestDetailsDialog requestId={detailsId} open={detailsOpen} onOpenChange={setDetailsOpen} />
      <LunchBreakFormDialog open={lunchFormOpen} onOpenChange={setLunchFormOpen} />
    </div>
  )
}