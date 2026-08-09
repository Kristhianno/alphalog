import * as React from "react"
import { MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AttachmentField } from "@/components/shared/AttachmentField"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { LunchBreakFormDialog } from "./LunchBreakFormDialog"
import { useDeletePausaAlmoco } from "@/hooks/usePausasAlmoco"
import { computeLunchDurationMinutes, formatDurationMinutes } from "@/domain/lunchBreak"
import { formatCurrency, formatDate } from "@/lib/format"
import type { PausaAlmoco } from "@/types/entities"

interface LunchBreakHistoryTableProps {
  records: PausaAlmoco[]
  driverNameById?: Map<string, string>
  canEdit?: boolean
}

export function LunchBreakHistoryTable({ records, driverNameById, canEdit = false }: LunchBreakHistoryTableProps) {
  const deletePausa = useDeletePausaAlmoco()
  const [editTarget, setEditTarget] = React.useState<PausaAlmoco | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = React.useState<PausaAlmoco | undefined>(undefined)
  const [viewTarget, setViewTarget] = React.useState<PausaAlmoco | undefined>(undefined)

  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum registro de pausa de almoço.</p>
  }

  const sorted = [...records].sort((a, b) => b.break_date.localeCompare(a.break_date))

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {driverNameById && <TableHead>Motorista</TableHead>}
              <TableHead>Data</TableHead>
              <TableHead>Saída</TableHead>
              <TableHead>Retorno</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((record) => {
              const duration = computeLunchDurationMinutes(record.exit_time, record.return_time)
              return (
                <TableRow key={record.id} className="cursor-pointer" onClick={() => setViewTarget(record)}>
                  {driverNameById && (
                    <TableCell>{driverNameById.get(record.driver_id) ?? "—"}</TableCell>
                  )}
                  <TableCell>{formatDate(record.break_date)}</TableCell>
                  <TableCell>{record.exit_time}</TableCell>
                  <TableCell>{record.return_time ?? "Em andamento"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {duration != null ? formatDurationMinutes(duration) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatCurrency(record.valor)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Ações">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setViewTarget(record)}>Ver detalhes</DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem onSelect={() => setEditTarget(record)}>Editar</DropdownMenuItem>
                        )}
                        <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(record)}>
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {canEdit && (
        <LunchBreakFormDialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(undefined)} record={editTarget} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(undefined)}
        title="Excluir registro de almoço"
        description="Esta ação remove definitivamente o registro."
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => {
          if (!deleteTarget) return
          await deletePausa.mutateAsync(deleteTarget.id)
          toast.success("Registro excluído.")
        }}
      />

      <ViewLunchBreakDialog record={viewTarget} onOpenChange={(o) => !o && setViewTarget(undefined)} />
    </>
  )
}

function ViewLunchBreakDialog({ record, onOpenChange }: { record?: PausaAlmoco; onOpenChange: (open: boolean) => void }) {
  const duration = record ? computeLunchDurationMinutes(record.exit_time, record.return_time) : undefined
  return (
    <Dialog open={!!record} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pausa de almoço</DialogTitle>
        </DialogHeader>
        {record && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Data</p>
                <p>{formatDate(record.break_date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duração</p>
                <p>{duration != null ? formatDurationMinutes(duration) : "Em andamento"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saída</p>
                <p>{record.exit_time}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Retorno</p>
                <p>{record.return_time ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor</p>
                <p>{formatCurrency(record.valor)}</p>
              </div>
            </div>
            {record.observacoes && (
              <div>
                <p className="text-xs text-muted-foreground">Observações</p>
                <p>{record.observacoes}</p>
              </div>
            )}
            <AttachmentField label="Comprovante" value={record.attachments} readOnly />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}