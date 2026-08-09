import * as React from "react"
import { FileDown, LayoutGrid, MoreHorizontal, Search, TrendingDown, TrendingUp } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useSolicitacoesList, useCancelSolicitacao, useDeleteSolicitacao } from "@/hooks/useSolicitacoes"
import { useClientesList } from "@/hooks/useClientes"
import { useTiposDeMaterialList } from "@/hooks/useMateriais"
import { usePrecosList } from "@/hooks/usePrecos"
import { useMotoristasList } from "@/hooks/useMotoristas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { toast } from "sonner"
import { ReasonPromptDialog } from "@/components/shared/ReasonPromptDialog"
import { RequestDetailsDialog } from "@/features/requests/RequestDetailsDialog"
import { InlineDriverCell, InlineFreightCell } from "./InlineEditCells"
import { exportSolicitacoesPdf } from "@/features/requests/exportRequestsPdf"
import { STATUS_BADGE_VARIANT, VEHICLE_TYPE_LABELS } from "@/lib/constants"
import { STATUS_LABELS, isClientEditableStatus, isStaffRole } from "@/domain/requestStatus"
import { resolveFreight } from "@/domain/pricing"
import { formatCurrency, formatDate } from "@/lib/format"
import { ACTIVE_REQUEST_STATUSES, REQUEST_STATUSES, VEHICLE_TYPES, type RequestStatus, type VehicleType } from "@/types/enums"
import type { Solicitacao } from "@/types/entities"

type StatusFilter = RequestStatus | "todos"
type TransportFilter = VehicleType | "todos"

interface StaffFilters {
  status: StatusFilter
  transportType: TransportFilter
  dateFrom: string
  dateTo: string
}

const DEFAULT_STAFF_FILTERS: StaffFilters = { status: "todos", transportType: "todos", dateFrom: "", dateTo: "" }

function filtersStorageKey(userId: string) {
  return `alphadata:dashboard-filters:${userId}`
}

function loadStaffFilters(userId: string): StaffFilters {
  try {
    const raw = localStorage.getItem(filtersStorageKey(userId))
    if (!raw) return DEFAULT_STAFF_FILTERS
    return { ...DEFAULT_STAFF_FILTERS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_STAFF_FILTERS
  }
}

function toLocalDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA")
}

export function DashboardPage() {
  const { actor } = useAuth()
  const isStaffActor = !!actor && isStaffRole(actor.role)
  const isMotoristaActor = actor?.role === "motorista"
  const isClienteActor = actor?.role === "cliente"

  const { data: solicitacoes, isLoading } = useSolicitacoesList()
  const { data: clientes } = useClientesList()
  const { data: materiais } = useTiposDeMaterialList()
  const { data: precos } = usePrecosList()
  const { data: motoristas } = useMotoristasList()
  const cancelSolicitacao = useCancelSolicitacao()
  const deleteSolicitacao = useDeleteSolicitacao()

  const [search, setSearch] = React.useState("")
  const [filters, setFilters] = React.useState<StaffFilters>(() =>
    actor && isStaffRole(actor.role) ? loadStaffFilters(actor.userId) : DEFAULT_STAFF_FILTERS,
  )

  React.useEffect(() => {
    if (actor && isStaffRole(actor.role)) {
      localStorage.setItem(filtersStorageKey(actor.userId), JSON.stringify(filters))
    }
  }, [actor, filters])

  const [detailsId, setDetailsId] = React.useState<string | undefined>(undefined)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [cancelTarget, setCancelTarget] = React.useState<Solicitacao | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = React.useState<Solicitacao | undefined>(undefined)

  const clienteById = React.useMemo(() => new Map((clientes ?? []).map((c) => [c.id, c])), [clientes])
  const materialById = React.useMemo(() => new Map((materiais ?? []).map((m) => [m.id, m])), [materiais])
  const motoristaById = React.useMemo(() => new Map((motoristas ?? []).map((m) => [m.id, m])), [motoristas])

  // O motorista vê aqui só as próprias entregas (a fila de disponíveis fica em Motoristas — doc/04).
  const roleScoped = React.useMemo(() => {
    if (!isMotoristaActor) return solicitacoes ?? []
    return (solicitacoes ?? []).filter((r) => r.driver_id === actor?.driverId)
  }, [solicitacoes, isMotoristaActor, actor])

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return roleScoped.filter((r) => {
      if (isStaffActor && filters.status !== "todos" && r.status !== filters.status) return false
      if (isStaffActor && filters.transportType !== "todos" && r.transport_type !== filters.transportType) return false
      if (isStaffActor && filters.dateFrom && toLocalDateKey(r.created_at) < filters.dateFrom) return false
      if (isStaffActor && filters.dateTo && toLocalDateKey(r.created_at) > filters.dateTo) return false
      if (!query) return true
      const clientName = clienteById.get(r.client_id)?.name ?? ""
      return (
        String(r.request_number).includes(query) ||
        r.requester.toLowerCase().includes(query) ||
        clientName.toLowerCase().includes(query)
      )
    })
  }, [roleScoped, search, filters, isStaffActor, clienteById])

  const todayKey = toLocalDateKey(new Date().toISOString())
  const yesterdayKey = toLocalDateKey(new Date(Date.now() - 86_400_000).toISOString())
  const todayCount = roleScoped.filter((r) => toLocalDateKey(r.created_at) === todayKey).length
  const yesterdayCount = roleScoped.filter((r) => toLocalDateKey(r.created_at) === yesterdayKey).length
  const todayVariation =
    yesterdayCount === 0 ? (todayCount > 0 ? 100 : 0) : Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)

  const emAndamentoCount = filtered.filter((r) => ACTIVE_REQUEST_STATUSES.includes(r.status)).length
  const entreguesCount = filtered.filter((r) => r.status === "entregue").length
  const totalFrete = isStaffActor
    ? filtered.reduce((sum, r) => {
        const { price } = resolveFreight({
          clientId: r.client_id,
          transportType: r.transport_type,
          originAddress: r.origin_address,
          destinationAddress: r.destination_address,
          freightOverride: r.freight_override,
          priceTable: precos ?? [],
        })
        return sum + (price ?? 0)
      }, 0)
    : 0

  function openDetails(id: string) {
    setDetailsId(id)
    setDetailsOpen(true)
  }

  function handleExportPdf() {
    exportSolicitacoesPdf({
      requests: filtered,
      clienteById: new Map([...clienteById.entries()].map(([id, c]) => [id, c.name])),
      materialById: new Map([...materialById.entries()].map(([id, m]) => [id, m.name])),
      motoristaById: new Map([...motoristaById.entries()].map(([id, m]) => [id, m.name])),
      precos: precos ?? [],
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total" value={filtered.length} />
        <StatCard
          label="Hoje"
          value={todayCount}
          trend={yesterdayCount > 0 || todayCount > 0 ? todayVariation : undefined}
        />
        <StatCard label="Em andamento" value={emAndamentoCount} />
        <StatCard label="Entregues" value={entreguesCount} />
        {isStaffActor && <StatCard label="Total de frete" value={formatCurrency(totalFrete)} />}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, solicitante ou cliente..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {isStaffActor && (
            <Select
              value={filters.status}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v as StatusFilter }))}
            >
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
          )}
          {isStaffActor && (
            <Select
              value={filters.transportType}
              onValueChange={(v) => setFilters((f) => ({ ...f, transportType: v as TransportFilter }))}
            >
              <SelectTrigger className="sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os transportes</SelectItem>
                {VEHICLE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {VEHICLE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {isStaffActor && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Período:</span>
            <Input
              type="date"
              className="w-40"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            />
            <span className="text-muted-foreground">até</span>
            <Input
              type="date"
              className="w-40"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            />
            {(filters.status !== "todos" || filters.transportType !== "todos" || filters.dateFrom || filters.dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => setFilters(DEFAULT_STAFF_FILTERS)}>
                Limpar filtros
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={filtered.length === 0}>
              <FileDown />
              Exportar PDF
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <LayoutGrid className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma solicitação encontrada.</p>
        </div>
      ) : (
        <>
        <Card className="hidden overflow-hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>{isClienteActor ? "Solicitante" : "Motorista"}</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Transporte</TableHead>
                <TableHead>Coleta</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                {isStaffActor && <TableHead>Frete</TableHead>}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => openDetails(r.id)}>
                  <TableCell className="font-medium">#{r.request_number}</TableCell>
                  <TableCell className="max-w-32 truncate">{clienteById.get(r.client_id)?.name ?? "—"}</TableCell>
                  <TableCell className="max-w-40" onClick={(e) => isStaffActor && e.stopPropagation()}>
                    {isClienteActor ? (
                      r.requester
                    ) : isStaffActor ? (
                      <InlineDriverCell request={r} motoristas={motoristas ?? []} />
                    ) : (
                      motoristaById.get(r.driver_id ?? "")?.name ?? "—"
                    )}
                  </TableCell>
                  <TableCell className="max-w-32 truncate text-muted-foreground">
                    {materialById.get(r.material_type_id)?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{VEHICLE_TYPE_LABELS[r.transport_type]}</TableCell>
                  <TableCell className="max-w-28 truncate text-muted-foreground">
                    {r.origin_company || "—"}
                  </TableCell>
                  <TableCell className="max-w-28 truncate text-muted-foreground">
                    {r.destination_company || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                  {isStaffActor && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <InlineFreightCell request={r} />
                    </TableCell>
                  )}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <RowActionsMenu
                      request={r}
                      isStaffActor={isStaffActor}
                      isOwnerClient={isClienteActor && r.client_id === actor?.clientId}
                      onOpenDetails={() => openDetails(r.id)}
                      onCancel={() => setCancelTarget(r)}
                      onDelete={() => setDeleteTarget(r)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <div className="space-y-3 md:hidden">
          {filtered.map((r) => (
            <Card key={r.id} className="p-4" onClick={() => openDetails(r.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">
                    #{r.request_number} — {clienteById.get(r.client_id)?.name ?? r.requester}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {isClienteActor ? r.requester : motoristaById.get(r.driver_id ?? "")?.name ?? "Sem motorista"}
                  </p>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <RowActionsMenu
                    request={r}
                    isStaffActor={isStaffActor}
                    isOwnerClient={isClienteActor && r.client_id === actor?.clientId}
                    onOpenDetails={() => openDetails(r.id)}
                    onCancel={() => setCancelTarget(r)}
                    onDelete={() => setDeleteTarget(r)}
                  />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_BADGE_VARIANT[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                <span className="text-xs text-muted-foreground">{VEHICLE_TYPE_LABELS[r.transport_type]}</span>
                {isStaffActor && (
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(
                      resolveFreight({
                        clientId: r.client_id,
                        transportType: r.transport_type,
                        originAddress: r.origin_address,
                        destinationAddress: r.destination_address,
                        freightOverride: r.freight_override,
                        priceTable: precos ?? [],
                      }).price,
                    )}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
            </Card>
          ))}
        </div>
        </>
      )}

      <RequestDetailsDialog requestId={detailsId} open={detailsOpen} onOpenChange={setDetailsOpen} />

      <ReasonPromptDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(undefined)}
        title={`Cancelar solicitação #${cancelTarget?.request_number}`}
        description="A solicitação será marcada como cancelada, mantendo o histórico."
        confirmLabel="Cancelar solicitação"
        onConfirm={async (reason) => {
          if (!cancelTarget) return
          await cancelSolicitacao.mutateAsync({ id: cancelTarget.id, reason })
          toast.success("Solicitação cancelada.")
        }}
      />
      <ReasonPromptDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(undefined)}
        title={`Excluir solicitação #${deleteTarget?.request_number}`}
        description="Esta ação remove definitivamente a solicitação e seu histórico."
        confirmLabel="Excluir definitivamente"
        destructive
        onConfirm={async (reason) => {
          if (!deleteTarget) return
          await deleteSolicitacao.mutateAsync({ id: deleteTarget.id, reason })
          toast.success("Solicitação excluída.")
        }}
      />
    </div>
  )
}

function StatCard({ label, value, trend }: { label: string; value: number | string; trend?: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <p className="text-2xl font-semibold">{value}</p>
        {trend != null && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${trend >= 0 ? "text-success" : "text-destructive"}`}
          >
            {trend >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {Math.abs(trend)}%
          </span>
        )}
      </CardContent>
    </Card>
  )
}

interface RowActionsMenuProps {
  request: Solicitacao
  isStaffActor: boolean
  isOwnerClient: boolean
  onOpenDetails: () => void
  onCancel: () => void
  onDelete: () => void
}

function RowActionsMenu({
  request,
  isStaffActor,
  isOwnerClient,
  onOpenDetails,
  onCancel,
  onDelete,
}: RowActionsMenuProps) {
  const clientCanEdit = isOwnerClient && isClientEditableStatus(request.status)
  const canCancel = isStaffActor || clientCanEdit

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ações">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onOpenDetails}>Ver detalhes / editar</DropdownMenuItem>
        {canCancel ? (
          <DropdownMenuItem onSelect={onCancel}>Cancelar</DropdownMenuItem>
        ) : (
          isOwnerClient && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <DropdownMenuItem disabled onSelect={(e) => e.preventDefault()}>
                    Cancelar
                  </DropdownMenuItem>
                </div>
              </TooltipTrigger>
              <TooltipContent>Só é possível cancelar antes de um motorista aceitar a corrida.</TooltipContent>
            </Tooltip>
          )
        )}
        {isStaffActor && (
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            Excluir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}