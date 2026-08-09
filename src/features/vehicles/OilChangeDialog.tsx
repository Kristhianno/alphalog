import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { useCreateTrocaDeOleo, useUpdateTrocaDeOleo } from "@/hooks/useOleo"
import type { Attachment, TrocaDeOleo, Veiculo } from "@/types/entities"

const schema = z
  .object({
    vehicleId: z.string().min(1, "Selecione o veículo."),
    changeDate: z.string().min(1, "Informe a data."),
    kmAtChange: z.string().min(1, "Informe o KM da troca."),
    nextChangeKm: z.string().min(1, "Informe o KM da próxima troca."),
    oilType: z.string().min(1, "Informe o tipo de óleo."),
    serviceCost: z.string().min(1, "Informe o custo do serviço."),
    notes: z.string().optional(),
  })
  .refine((data) => Number(data.nextChangeKm) > Number(data.kmAtChange), {
    message: "O KM da próxima troca deve ser maior que o KM da troca atual.",
    path: ["nextChangeKm"],
  })

type FormValues = z.infer<typeof schema>

interface OilChangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  veiculos: Veiculo[]
  defaultVehicleId?: string
  record?: TrocaDeOleo
}

export function OilChangeDialog({ open, onOpenChange, veiculos, defaultVehicleId, record }: OilChangeDialogProps) {
  const isEditing = !!record
  const createOleo = useCreateTrocaDeOleo()
  const updateOleo = useUpdateTrocaDeOleo(record?.vehicle_id ?? "")
  const isSubmitting = createOleo.isPending || updateOleo.isPending
  const [attachments, setAttachments] = React.useState<Attachment[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicleId: "",
      changeDate: "",
      kmAtChange: "",
      nextChangeKm: "",
      oilType: "",
      serviceCost: "",
      notes: "",
    },
  })

  React.useEffect(() => {
    if (!open) return
    form.reset({
      vehicleId: record?.vehicle_id ?? defaultVehicleId ?? "",
      changeDate: record?.change_date ?? new Date().toISOString().slice(0, 10),
      kmAtChange: record?.km_at_change != null ? String(record.km_at_change) : "",
      nextChangeKm: record?.next_change_km != null ? String(record.next_change_km) : "",
      oilType: record?.oil_type ?? "",
      serviceCost: record?.service_cost != null ? String(record.service_cost) : "",
      notes: record?.notes ?? "",
    })
    setAttachments(record?.attachments ?? [])
  }, [open, record, defaultVehicleId, form])

  async function onSubmit(values: FormValues) {
    const vehicle = veiculos.find((v) => v.id === values.vehicleId)
    if (!vehicle) return
    try {
      const input = {
        vehicleId: values.vehicleId,
        vehiclePlate: vehicle.plate,
        changeDate: values.changeDate,
        kmAtChange: Number(values.kmAtChange),
        nextChangeKm: Number(values.nextChangeKm),
        oilType: values.oilType,
        serviceCost: Number(values.serviceCost),
        notes: values.notes || undefined,
        attachments,
      }
      if (isEditing) {
        await updateOleo.mutateAsync({ id: record.id, patch: input })
        toast.success("Troca de óleo atualizada.")
      } else {
        await createOleo.mutateAsync(input)
        toast.success("Troca de óleo registrada.")
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a troca de óleo.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent preventOutsideClose>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar troca de óleo" : "Registrar troca de óleo"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Veículo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a placa" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {veiculos.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.plate} — {v.brand} {v.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="changeDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="oilType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de óleo</FormLabel>
                    <FormControl>
                      <Input placeholder="5W30 sintético..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="kmAtChange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KM da troca</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nextChangeKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KM da próxima troca</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="serviceCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custo do serviço</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}