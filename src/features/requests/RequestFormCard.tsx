import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Send } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useCreateSolicitacao } from "@/hooks/useSolicitacoes"
import { useClientesList } from "@/hooks/useClientes"
import { useTiposDeMaterialList } from "@/hooks/useMateriais"
import { peekNextRequestNumber } from "@/mocks/api/solicitacoes.api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { VEHICLE_TYPE_LABELS } from "@/lib/constants"
import { VEHICLE_TYPES } from "@/types/enums"
import { resolveRegionFromAddress } from "@/domain/regions"
import { useRequestDraft } from "./useRequestDraft"
import type { Attachment } from "@/types/entities"

const baseSchema = z.object({
  clientId: z.string().optional(),
  requester: z.string().min(2, "Informe o nome do solicitante."),
  requesterPhone: z.string().min(8, "Informe um telefone válido."),
  originAddress: z.string().min(5, "Informe o endereço de origem."),
  originCompany: z.string().optional(),
  destinationAddress: z.string().min(5, "Informe o endereço de destino."),
  destinationCompany: z.string().optional(),
  materialTypeId: z.string().min(1, "Selecione o tipo de material."),
  transportType: z.enum(VEHICLE_TYPES),
  invoiceNumber: z.string().optional(),
  opNumber: z.string().optional(),
  notes: z.string().optional(),
  scheduleEnabled: z.boolean(),
  scheduledDate: z.string().optional(),
})

type FormValues = z.infer<typeof baseSchema>

const DEFAULT_VALUES: FormValues = {
  clientId: "",
  requester: "",
  requesterPhone: "",
  originAddress: "",
  originCompany: "",
  destinationAddress: "",
  destinationCompany: "",
  materialTypeId: "",
  transportType: "utilitario",
  invoiceNumber: "",
  opNumber: "",
  notes: "",
  scheduleEnabled: false,
  scheduledDate: "",
}

function RegionBadge({ address }: { address: string }) {
  if (!address || address.trim().length < 5) return null
  const region = resolveRegionFromAddress(address)
  return (
    <p className="text-xs text-muted-foreground">
      Região detectada: <span className="font-medium text-foreground">{region ?? "não identificada"}</span>
    </p>
  )
}

export function RequestFormCard() {
  const { actor } = useAuth()
  const isStaffActor = actor?.role === "admin" || actor?.role === "gestor" || actor?.role === "assistente_logistico"
  const isClienteActor = actor?.role === "cliente"

  const { data: clientes } = useClientesList()
  const { data: materiais } = useTiposDeMaterialList()
  const createSolicitacao = useCreateSolicitacao()
  const [attachments, setAttachments] = React.useState<Attachment[]>([])
  const [nextNumber, setNextNumber] = React.useState(() => peekNextRequestNumber())

  const schema = baseSchema.superRefine((data, ctx) => {
    if (isStaffActor && !data.clientId) {
      ctx.addIssue({ code: "custom", message: "Selecione o cliente.", path: ["clientId"] })
    }
    if (data.scheduleEnabled && !data.scheduledDate?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Informe a data/hora da coleta agendada.",
        path: ["scheduledDate"],
      })
    }
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  })

  const { clearDraft } = useRequestDraft(form, DEFAULT_VALUES)

  const scheduleEnabled = form.watch("scheduleEnabled")
  const originAddress = form.watch("originAddress")
  const destinationAddress = form.watch("destinationAddress")

  async function onSubmit(values: FormValues) {
    if (isClienteActor && !actor?.clientId) {
      toast.error("Seu usuário não está vinculado a um cadastro de cliente. Contate a administração.")
      return
    }

    try {
      const result = await createSolicitacao.mutateAsync({
        clientId: isStaffActor ? values.clientId! : actor!.clientId!,
        materialTypeId: values.materialTypeId,
        transportType: values.transportType,
        originAddress: values.originAddress,
        originCompany: values.originCompany || undefined,
        destinationAddress: values.destinationAddress,
        destinationCompany: values.destinationCompany || undefined,
        requester: values.requester,
        requesterPhone: values.requesterPhone,
        invoiceNumber: values.invoiceNumber || undefined,
        opNumber: values.opNumber || undefined,
        notes: values.notes || undefined,
        scheduledDate: values.scheduleEnabled ? values.scheduledDate : undefined,
        attachments,
      })
      toast.success(`Solicitação #${result.request_number} criada.`)
      form.reset(DEFAULT_VALUES)
      setAttachments([])
      clearDraft()
      setNextNumber(peekNextRequestNumber())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a solicitação.")
    }
  }

  if (isClienteActor && !actor?.clientId) {
    return (
      <Alert variant="warning">
        <AlertDescription>
          Seu usuário ainda não está vinculado a um cadastro de cliente. Contate a administração para
          liberar a criação de solicitações.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Nova solicitação</CardTitle>
        <span className="text-xs text-muted-foreground">Próximo número: #{nextNumber}</span>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isStaffActor && (
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(clientes ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="requester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do solicitante</FormLabel>
                    <FormControl>
                      <Input placeholder="Quem está pedindo a coleta" {...field} />
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
                    <FormLabel>Telefone do solicitante</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 90000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <FormField
                  control={form.control}
                  name="originAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço de origem</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, número, bairro, cidade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <RegionBadge address={originAddress} />
              </div>
              <div className="space-y-1">
                <FormField
                  control={form.control}
                  name="destinationAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço de destino</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, número, bairro, cidade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <RegionBadge address={destinationAddress} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="originCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa de coleta (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="destinationCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa de entrega (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Tipo de material</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(materiais ?? []).map((m) => (
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
                    <Select value={field.value} onValueChange={field.onChange}>
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nota fiscal (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Número de pedido/ordem (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <AttachmentField label="Anexos (opcional)" value={attachments} onChange={setAttachments} />

            <div className="rounded-md border border-border p-3">
              <FormField
                control={form.control}
                name="scheduleEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-2">
                    <div>
                      <FormLabel className="text-sm">Agendar coleta</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Define uma data/hora futura; a solicitação nasce como "agendada".
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              {scheduleEnabled && (
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem className="mt-3">
                      <FormLabel>Data/hora da coleta</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <Button type="submit" disabled={createSolicitacao.isPending}>
              <Send />
              {createSolicitacao.isPending ? "Enviando..." : "Criar solicitação"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}