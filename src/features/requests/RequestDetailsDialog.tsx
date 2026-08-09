import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { MapPin, Route } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import {
  useSolicitacao,
  useHistoricoSolicitacao,
  useUpdateSolicitacao,
  useChangeSolicitacaoStatus,
  useAcceptSolicitacao,
  useCancelSolicitacao,
  useDeleteSolicitacao,
} from "@/hooks/useSolicitacoes"
import { useClientesList } from "@/hooks/useClientes"
import { useTiposDeMaterialList } from "@/hooks/useMateriais"
import { usePrecosList } from "@/hooks/usePrecos"
import { useMotoristasList } from "@/hooks/useMotoristas"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { AttachmentField } from "@/components/shared/AttachmentField"
import { ReasonPromptDialog } from "@/components/shared/ReasonPromptDialog"
import { StatusTimeline } from "./StatusTimeline"
import {
  PAYMENT_METHOD_LABELS,
  STATUS_BADGE_VARIANT,
  VEHICLE_TYPE_LABELS,
} from "@/lib/constants"
import { formatCurrency, formatDateTime, formatKm } from "@/lib/format"
import { externalMapsUrl } from "@/lib/maps"
import { resolveFreight } from "@/domain/pricing"
import { coordinatesFromAddress } from "@/domain/regions"
import { haversineKm } from "@/domain/distance"
import {
  STATUS_LABELS,
  canTransition,
  isClientEditableStatus,
  isStaffRole,
  requiresAttachmentForTransition,
} from "@/domain/requestStatus"
import {
  PAYMENT_METHODS,
  REQUEST_STATUSES,
  VEHICLE_TYPES,
  type Role,
  type RequestStatus,
} from "@/types/enums"
import type { Attachment, PrecoDeFrete, Solicitacao, TipoDeMaterial } from "@/types/entities"

const editSchema = z.object({
  materialTypeId: z.string().min(1, "Selecione o tipo de material."),
  transportType: z.enum(VEHICLE_TYPES),
  originAddress: z.string().min(5, "Informe o endereço de origem."),
  originCompany: z.string().optional(),
  destinationAddress: z.string().min(5, "Informe o endereço de destino."),
  destinationCompany: z.string().optional(),
  requester: z.string().min(2, "Informe o solicitante."),
  requesterPhone: z.string().min(8, "Informe um telefone válido."),
  invoiceNumber: z.string().optional(),
  opNumber: z.string().optional(),
  notes: z.string().optional(),
  freightOverride: z.string().optional(),
  paymentMethod: z.string().optional(),
})

type EditFormValues = z.infer<typeof editSchema>

interface RequestDetailsDialogProps {
  requestId: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RequestDetailsDialog({ requestId, open, onOpenChange }: RequestDetailsDialogProps) {
  const { actor } = useAuth()
  const { data: request, isLoading } = useSolicitacao(requestId)
  const { data: historico } = useHistoricoSolicitacao(requestId)
  const { data: clientes } = useClientesList()
  const { data: materiais } = useTiposDeMaterialList()
  const { data: precos } = usePrecosList()
  const { data: motoristas } = useMotoristasList()

  const changeStatus = useChangeSolicitacaoStatus()
  const acceptSolicitacao = useAcceptSolicitacao()
  const cancelSolicitacao = useCancelSolicitacao()
  const deleteSolicitacao = useDeleteSolicitacao()

  const [cancelOpen, setCancelOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [targetStatus, setTargetStatus] = React.useState<RequestStatus | "">("")
  const [transitionNotes, setTransitionNotes] = React.useState("")
  const [transitionAttachments, setTransitionAttachments] = React.useState<Attachment[]>([])

  React.useEffect(() => {
    if (!open) return
    setTargetStatus("")
    setTransitionNotes("")
    setTransitionAttachments([])
  }, [open, requestId])

  const isStaffActor = !!actor && isStaffRole(actor.role)
  const isOwnerDriver = !!actor && actor.role === "motorista" && !!request && request.driver_id === actor.driverId
  const isOwnerClient = !!actor && actor.role === "cliente" && !!request && request.client_id === actor.clientId

  const canEditFields = isStaffActor || (isOwnerClient && !!request && isClientEditableStatus(request.status))

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent preventOutsideClose className="max-w-2xl">
        {isLoading || !request ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle>Solicitação #{request.request_number}</DialogTitle>
                <Badge variant={STATUS_BADGE_VARIANT[request.status]}>
                  {STATUS_LABELS[request.status]}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-5">
              <RequestEditForm
                key={request.id}
                request={request}
                canEditFields={canEditFields}
                isStaffActor={isStaffActor}
                materiais={materiais ?? []}
                precos={precos ?? []}
                clientName={clientes?.find((c) => c.id === request.client_id)?.name ?? "—"}
                driverName={motoristas?.find((m) => m.id === request.driver_id)?.name ?? "Sem motorista atribuído"}
              />

              <Separator />

              <div>
                <p className="mb-3 text-sm font-medium">Linha do tempo</p>
                <StatusTimeline
                  currentStatus={request.status}
                  hadScheduledStart={!!historico?.some((h) => h.status === "agendada")}
                  historico={historico ?? []}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                {actor?.role === "motorista" &&
                  request.status === "solicitada" &&
                  !request.driver_id && (
                    <Button
                      type="button"
                      disabled={acceptSolicitacao.isPending}
                      onClick={async () => {
                        try {
                          await acceptSolicitacao.mutateAsync(request.id)
                          toast.success("Corrida aceita!")
                        } catch (error) {
                          toast.error(
                            error instanceof Error ? error.message : "Não foi possível aceitar a corrida.",
                          )
                        }
                      }}
                    >
                      Aceitar corrida
                    </Button>
                  )}

                {(isStaffActor || isOwnerDriver) && (
                  <StatusForceControl
                    request={request}
                    role={actor!.role}
                    targetStatus={targetStatus}
                    setTargetStatus={setTargetStatus}
                    notes={transitionNotes}
                    setNotes={setTransitionNotes}
                    attachments={transitionAttachments}
                    setAttachments={setTransitionAttachments}
                    isPending={changeStatus.isPending}
                    onConfirm={async () => {
                      if (!targetStatus) return
                      if (requiresAttachmentForTransition(targetStatus) && transitionAttachments.length === 0) {
                        toast.error("Anexe ao menos uma foto de evidência antes de confirmar a coleta.")
                        return
                      }
                      try {
                        await changeStatus.mutateAsync({
                          id: request.id,
                          target: targetStatus,
                          notes: transitionNotes || undefined,
                          attachments: transitionAttachments,
                        })
                        toast.success("Status atualizado.")
                        setTargetStatus("")
                        setTransitionNotes("")
                        setTransitionAttachments([])
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o status.")
                      }
                    }}
                  />
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {(isStaffActor || isOwnerClient || isOwnerDriver) &&
                    request.status !== "entregue" &&
                    request.status !== "cancelada" && (
                      <Button type="button" variant="outline" onClick={() => setCancelOpen(true)}>
                        Cancelar solicitação
                      </Button>
                    )}
                  {isStaffActor && (
                    <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
                      Excluir definitivamente
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>

      <ReasonPromptDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar solicitação"
        description="A solicitação será marcada como cancelada, mantendo o histórico."
        confirmLabel="Cancelar solicitação"
        onConfirm={async (reason) => {
          if (!request) return
          await cancelSolicitacao.mutateAsync({ id: request.id, reason })
          toast.success("Solicitação cancelada.")
        }}
      />
      <ReasonPromptDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir solicitação"
        description="Esta ação remove definitivamente a solicitação e seu histórico — use apenas para correção de cadastro."
        confirmLabel="Excluir definitivamente"
        destructive
        onConfirm={async (reason) => {
          if (!request) return
          await deleteSolicitacao.mutateAsync({ id: request.id, reason })
          toast.success("Solicitação excluída.")
          onOpenChange(false)
        }}
      />
    </Dialog>
  )
}

interface RequestEditFormProps {
  request: Solicitacao
  canEditFields: boolean
  isStaffActor: boolean
  materiais: TipoDeMaterial[]
  precos: PrecoDeFrete[]
  clientName: string
  driverName: string
}

/**
 * Formulário de edição, com a chave `request.id` no componente pai forçando uma nova
 * instância do react-hook-form a cada solicitação aberta. Evita depender de `form.reset()`
 * num efeito assíncrono, cuja corrida com o StrictMode fazia o Select de material perder o
 * valor selecionado (o componente controlado montava antes do reset aplicar o valor real).
 */
function RequestEditForm({
  request,
  canEditFields,
  isStaffActor,
  materiais,
  precos,
  clientName,
  driverName,
}: RequestEditFormProps) {
  const updateSolicitacao = useUpdateSolicitacao()
  const [generalAttachments, setGeneralAttachments] = React.useState<Attachment[]>(request.attachments)

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      materialTypeId: request.material_type_id,
      transportType: request.transport_type,
      originAddress: request.origin_address,
      originCompany: request.origin_company ?? "",
      destinationAddress: request.destination_address,
      destinationCompany: request.destination_company ?? "",
      requester: request.requester,
      requesterPhone: request.requester_phone,
      invoiceNumber: request.invoice_number ?? "",
      opNumber: request.op_number ?? "",
      notes: request.notes ?? "",
      freightOverride: request.freight_override != null ? String(request.freight_override) : "",
      paymentMethod: request.payment_method ?? "",
    },
  })

  const freightResolution = resolveFreight({
    clientId: request.client_id,
    transportType: request.transport_type,
    originAddress: request.origin_address,
    destinationAddress: request.destination_address,
    freightOverride: request.freight_override,
    priceTable: precos,
  })

  return (
    <Form {...form}>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await updateSolicitacao.mutateAsync({
              id: request.id,
              patch: {
                material_type_id: values.materialTypeId,
                transport_type: values.transportType,
                origin_address: values.originAddress,
                origin_company: values.originCompany || undefined,
                destination_address: values.destinationAddress,
                destination_company: values.destinationCompany || undefined,
                requester: values.requester,
                requester_phone: values.requesterPhone,
                invoice_number: values.invoiceNumber || undefined,
                op_number: values.opNumber || undefined,
                notes: values.notes || undefined,
                attachments: generalAttachments,
                ...(isStaffActor
                  ? {
                      freight_override:
                        values.freightOverride?.trim() ? Number(values.freightOverride) : undefined,
                      payment_method: (values.paymentMethod || undefined) as never,
                    }
                  : {}),
              },
            })
            toast.success("Solicitação atualizada.")
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Não foi possível salvar.")
          }
        })}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadOnlyValue label="Cliente" value={clientName} />
          <ReadOnlyValue label="Motorista" value={driverName} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="requester"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Solicitante</FormLabel>
                <FormControl>
                  <Input disabled={!canEditFields} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="requesterPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input disabled={!canEditFields} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="materialTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Material</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={!canEditFields}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {materiais.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="transportType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de transporte</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={!canEditFields}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {VEHICLE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {VEHICLE_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isStaffActor ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="freightOverride"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Valor do frete{" "}
                    {!field.value && (
                      <span className="font-normal text-muted-foreground">
                        (tabela: {formatCurrency(freightResolution.price)})
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="Ajuste manual" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de pagamento</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Não definida" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {PAYMENT_METHOD_LABELS[method]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
            <ReadOnlyValue label="Valor do frete" value={formatCurrency(freightResolution.price)} />
            <ReadOnlyValue
              label="Forma de pagamento"
              value={request.payment_method ? PAYMENT_METHOD_LABELS[request.payment_method] : "Não definida"}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadOnlyValue label="Data da solicitação" value={formatDateTime(request.created_at)} />
          <ReadOnlyValue
            label="Agendamento"
            value={request.scheduled_date ? formatDateTime(request.scheduled_date) : "—"}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="invoiceNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nota fiscal</FormLabel>
                <FormControl>
                  <Input disabled={!canEditFields} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="opNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pedido/ordem</FormLabel>
                <FormControl>
                  <Input disabled={!canEditFields} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AddressCard label="Origem" address={request.origin_address} />
          <AddressCard label="Destino" address={request.destination_address} />
        </div>
        <DistanceEstimate origin={request.origin_address} destination={request.destination_address} />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea rows={2} disabled={!canEditFields} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <AttachmentField
          label="Anexos"
          value={generalAttachments}
          onChange={isStaffActor ? setGeneralAttachments : undefined}
          readOnly={!isStaffActor}
        />

        {canEditFields && (
          <Button type="submit" disabled={updateSolicitacao.isPending || !form.formState.isDirty}>
            {updateSolicitacao.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        )}
      </form>
    </Form>
  )
}

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-sm text-muted-foreground">{value}</p>
    </div>
  )
}

function AddressCard({ label, address }: { label: string; address: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-start gap-2">
        <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-sm">{address}</p>
          <a
            href={externalMapsUrl(address)}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Route className="size-3" />
            Abrir rota
          </a>
        </div>
      </div>
    </Card>
  )
}

function DistanceEstimate({ origin, destination }: { origin: string; destination: string }) {
  const a = coordinatesFromAddress(origin)
  const b = coordinatesFromAddress(destination)
  if (!a || !b) return null
  const km = haversineKm(a, b)
  return <p className="text-xs text-muted-foreground">Distância estimada: {formatKm(km)}</p>
}

interface StatusForceControlProps {
  request: { status: RequestStatus }
  role: Role
  targetStatus: RequestStatus | ""
  setTargetStatus: (status: RequestStatus | "") => void
  notes: string
  setNotes: (notes: string) => void
  attachments: Attachment[]
  setAttachments: (attachments: Attachment[]) => void
  isPending: boolean
  onConfirm: () => void
}

function StatusForceControl({
  request,
  role,
  targetStatus,
  setTargetStatus,
  notes,
  setNotes,
  attachments,
  setAttachments,
  isPending,
  onConfirm,
}: StatusForceControlProps) {
  const options = REQUEST_STATUSES.filter(
    (status) => status !== "cancelada" && canTransition(role, request.status, status).allowed,
  )

  if (options.length === 0) return null

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <p className="text-sm font-medium">Atualizar status</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Select value={targetStatus} onValueChange={(v) => setTargetStatus(v as RequestStatus)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o novo status" />
            </SelectTrigger>
            <SelectContent>
              {options.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" disabled={!targetStatus || isPending} onClick={onConfirm}>
          {isPending ? "Atualizando..." : "Confirmar"}
        </Button>
      </div>
      {targetStatus && (
        <>
          <Textarea
            placeholder="Nota sobre esta etapa (opcional)"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {requiresAttachmentForTransition(targetStatus) && (
            <AttachmentField
              label="Evidência da coleta (obrigatório)"
              value={attachments}
              onChange={setAttachments}
            />
          )}
        </>
      )}
    </div>
  )
}