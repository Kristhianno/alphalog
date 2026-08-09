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
import { useCreateRegistroManutencao, useUpdateRegistroManutencao } from "@/hooks/useManutencao"
import { MAINTENANCE_TYPE_LABELS } from "@/lib/constants"
import { MAINTENANCE_TYPES } from "@/types/enums"
import type { Attachment, RegistroManutencao, Veiculo } from "@/types/entities"

const schema = z.object({
  vehicleId: z.string().min(1, "Selecione o veículo."),
  maintenanceType: z.enum(MAINTENANCE_TYPES),
  maintenanceDate: z.string().min(1, "Informe a data."),
  currentKm: z.string().min(1, "Informe o KM atual."),
  serviceCost: z.string().min(1, "Informe o custo do serviço."),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface MaintenanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  veiculos: Veiculo[]
  defaultVehicleId?: string
  record?: RegistroManutencao
}

export function MaintenanceDialog({ open, onOpenChange, veiculos, defaultVehicleId, record }: MaintenanceDialogProps) {
  const isEditing = !!record
  const createManutencao = useCreateRegistroManutencao()
  const updateManutencao = useUpdateRegistroManutencao(record?.vehicle_id ?? "")
  const isSubmitting = createManutencao.isPending || updateManutencao.isPending
  const [attachments, setAttachments] = React.useState<Attachment[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicleId: "",
      maintenanceType: "preventiva",
      maintenanceDate: "",
      currentKm: "",
      serviceCost: "",
      notes: "",
    },
  })

  React.useEffect(() => {
    if (!open) return
    form.reset({
      vehicleId: record?.vehicle_id ?? defaultVehicleId ?? "",
      maintenanceType: record?.maintenance_type ?? "preventiva",
      maintenanceDate: record?.maintenance_date ?? new Date().toISOString().slice(0, 10),
      currentKm: record?.current_km != null ? String(record.current_km) : "",
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
        maintenanceType: values.maintenanceType,
        maintenanceDate: values.maintenanceDate,
        currentKm: Number(values.currentKm),
        serviceCost: Number(values.serviceCost),
        notes: values.notes || undefined,
        attachments,
      }
      if (isEditing) {
        await updateManutencao.mutateAsync({ id: record.id, patch: input })
        toast.success("Manutenção atualizada.")
      } else {
        await createManutencao.mutateAsync(input)
        toast.success("Manutenção registrada.")
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a manutenção.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent preventOutsideClose>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar manutenção" : "Registrar manutenção"}</DialogTitle>
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maintenanceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MAINTENANCE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {MAINTENANCE_TYPE_LABELS[type]}
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
                name="maintenanceDate"
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currentKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KM atual</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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