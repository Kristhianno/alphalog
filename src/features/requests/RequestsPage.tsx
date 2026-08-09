import * as React from "react"
import { FileDown, MoreHorizontal, PackageSearch, Search } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import {
  useSolicitacoesList,
  useCancelSolicitacao,
  useDeleteSolicitacao,
} from "@/hooks/useSolicitacoes"
import { useClientesList } from "@/hooks/useClientes"
import { useTiposDeMaterialList } from "@/hooks/useMateriais"
import { usePrecosList } from "@/hooks/usePrecos"
import { useMotoristasList } from "@/hooks/useMotoristas"
import { exportSolicitacoesPdf } from "./exportRequestsPdf"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
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
import { RequestFormCard } from "./RequestFormCard"
import { RequestDetailsDialog } from "./RequestDetailsDialog"
import { STATUS_BADGE_VARIANT, VEHICLE_TYPE_LABELS } from "@/lib/constants"
import { STATUS_LABELS, isClientEditableStatus, isStaffRole } from "@/domain/requestStatus"
import { resolveFreight } from "@/domain/pricing"
import { formatCurrency, formatDate } from "@/lib/format"
import { REQUEST_STATUSES, type RequestStatus } from "@/types/enums"
import type { Solicitacao } from "@/types/entities"

type StatusFilter = RequestStatus | "todos"

export function RequestsPage() {
  const { actor } = useAuth()
  const isStaffActor = !!actor && isStaffRole(actor.role)

  const { data: solicitacoes, isLoading } = useSolicitacoesList()
  const { data: clientes } = useClientesList()
  const { data: materiais } = useTiposDeMaterialList()
  const { data: precos } = usePrecosList()
  const { data: motoristas } = useMotoristasList()
  const cancelSolicitacao = useCancelSolicitacao()
  const deleteSolicitacao = useDeleteSolicitacao()

  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("todos")
  const [detailsId, setDetailsId] = React.useState<string | undefined>(undefined)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [cancelTarget, setCancelTarget] = React.useState<Solicitacao | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = React.useState<Solicitacao | undefined>(undefined)

  const clienteById = React.useMemo(
    () => new Map((clientes ?? []).map((c) => [c.id, c])),
    [clientes],
  )
  const materialById = React.useMemo(
    () => new Map((materiais ?? []).map((m) => [m.id, m])),
    [materiais],
  )
  const motoristaNameById = React.useMemo(
    () => new Map((motoristas ?? []).map((m) => [m.id, m.name])),
    [motoristas],
  )

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return (solicitacoes ?? []).filter((r) => {
      if (statusFilter !== "todos" && r.status !== statusFilter) return false
      if (!query) return true
      const clientName = clienteById.get(r.client_id)?.name ?? ""
      return (
        String(r.request_number).includes(query) ||
        r.requester.toLowerCase().includes(query) ||
        r.requester_phone.toLowerCase().includes(query) ||
        clientName.toLowerCase().includes(query)
      )
    })
  }, [solicitacoes, search, statusFilter, clienteById])

  function openDetails(id: string) {
    setDetailsId(id)
    setDetailsOpen(true)
  }

  function handleExportPdf() {
    exportSolicitacoesPdf({
      requests: filtered,
      subtitle: statusFilter !== "todos" ? `Filtro de status: ${STATUS_LABELS[statusFilter]}` : undefined,
      clienteById: new Map([...clienteById.entries()].map(([id, c]) => [id, c.name])),
      materialById: new Map([...materialById.entries()].map(([id, m]) => [id, m.name])),
      motoristaById: motoristaNameById,
      precos: precos ?? [],
    })
  }

  return (
    <div className="space-y-6">
      <RequestFormCard />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, solicitante ou cliente..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="sm:w-56">
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
        {isStaffActor && (
          <Button variant="outline" onClick={handleExportPdf} disabled={filtered.length === 0}>
            <FileDown />
            Exportar PDF
          </Button>
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
          <PackageSearch className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma solicitação encontrada.</p>
        </div>
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  {isStaffActor && <TableHead>Cliente</TableHead>}
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Transporte</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  {isStaffActor && <TableHead>Frete</TableHead>}
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <RequestRow
                    key={r.id}
                    request={r}
                    clientName={clienteById.get(r.client_id)?.name}
                    materialName={materialById.get(r.material_type_id)?.name}
                    freight={
                      isStaffActor
                        ? resolveFreight({
                            clientId: r.client_id,
                            transportType: r.transport_type,
                            originAddress: r.origin_address,
                            destinationAddress: r.destination_address,
                            freightOverride: r.freight_override,
                            priceTable: precos ?? [],
                          }).price
                        : undefined
                    }
                    isStaffActor={isStaffActor}
                    isOwnerClient={actor?.role === "cliente" && r.client_id === actor.clientId}
                    onOpenDetails={() => openDetails(r.id)}
                    onCancel={() => setCancelTarget(r)}
                    onDelete={() => setDeleteTarget(r)}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="space-y-3 md:hidden">
            {filtered.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                clientName={clienteById.get(r.client_id)?.name}
                materialName={materialById.get(r.material_type_id)?.name}
                isStaffActor={isStaffActor}
                isOwnerClient={actor?.role === "cliente" && r.client_id === actor.clientId}
                onOpenDetails={() => openDetails(r.id)}
                onCancel={() => setCancelTarget(r)}
                onDelete={() => setDeleteTarget(r)}
              />
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

interface RowSharedProps {
  request: Solicitacao
  clientName: string | undefined
  materialName: string | undefined
  isStaffActor: boolean
  isOwnerClient: boolean
  onOpenDetails: () => void
  onCancel: () => void
  onDelete: () => void
}

function RequestActionsMenu({
  request,
  isStaffActor,
  isOwnerClient,
  onOpenDetails,
  onCancel,
  onDelete,
}: RowSharedProps) {
  const canCancel = isStaffActor || (isOwnerClient && isClientEditableStatus(request.status))
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ações">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onOpenDetails}>Ver detalhes / editar</DropdownMenuItem>
        {canCancel && <DropdownMenuItem onSelect={onCancel}>Cancelar</DropdownMenuItem>}
        {isStaffActor && (
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            Excluir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function RequestRow(props: RowSharedProps & { freight: number | undefined }) {
  const { request, clientName, materialName, isStaffActor } = props
  return (
    <TableRow className="cursor-pointer" onClick={props.onOpenDetails}>
      <TableCell className="font-medium">#{request.request_number}</TableCell>
      {isStaffActor && <TableCell className="max-w-40 truncate">{clientName ?? "—"}</TableCell>}
      <TableCell className="max-w-40 truncate">{request.requester}</TableCell>
      <TableCell className="max-w-36 truncate text-muted-foreground">{materialName ?? "—"}</TableCell>
      <TableCell className="text-muted-foreground">{VEHICLE_TYPE_LABELS[request.transport_type]}</TableCell>
      <TableCell>
        <Badge variant={STATUS_BADGE_VARIANT[request.status]}>{STATUS_LABELS[request.status]}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">{formatDate(request.created_at)}</TableCell>
      {isStaffActor && <TableCell className="text-muted-foreground">{formatCurrency(props.freight)}</TableCell>}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <RequestActionsMenu {...props} />
      </TableCell>
    </TableRow>
  )
}

function RequestCard(props: RowSharedProps) {
  const { request, clientName, materialName, isStaffActor } = props
  return (
    <Card className="p-4" onClick={props.onOpenDetails}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">#{request.request_number} — {request.requester}</p>
          {isStaffActor && clientName && (
            <p className="truncate text-xs text-muted-foreground">{clientName}</p>
          )}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <RequestActionsMenu {...props} />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_BADGE_VARIANT[request.status]}>{STATUS_LABELS[request.status]}</Badge>
        <span className="text-xs text-muted-foreground">{VEHICLE_TYPE_LABELS[request.transport_type]}</span>
        {materialName && <span className="text-xs text-muted-foreground">{materialName}</span>}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{formatDate(request.created_at)}</p>
    </Card>
  )
}