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
import { useCreateLogCombustivel, useUpdateLogCombustivel } from "@/hooks/useCombustivel"
import { FUEL_TYPE_LABELS } from "@/lib/constants"
import { formatCurrency } from "@/lib/format"
import { FUEL_TYPES } from "@/types/enums"
import type { Attachment, LogCombustivel, Veiculo } from "@/types/entities"

const schema = z.object({
  vehicleId: z.string().min(1, "Selecione o veículo."),
  logDate: z.string().min(1, "Informe a data."),
  kmInitial: z.string().min(1, "Informe o KM inicial."),
  kmFinal: z.string().min(1, "Informe o KM atual."),
  fuelType: z.enum(FUEL_TYPES),
  liters: z.string().min(1, "Informe os litros."),
  fuelPrice: z.string().min(1, "Informe o preço por litro."),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface FuelLogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  veiculos: Veiculo[]
  defaultVehicleId?: string
  record?: LogCombustivel
}

export function FuelLogDialog({ open, onOpenChange, veiculos, defaultVehicleId, record }: FuelLogDialogProps) {
  const isEditing = !!record
  const createLog = useCreateLogCombustivel()
  const updateLog = useUpdateLogCombustivel(record?.vehicle_id ?? "")
  const isSubmitting = createLog.isPending || updateLog.isPending
  const [attachments, setAttachments] = React.useState<Attachment[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicleId: "",
      logDate: "",
      kmInitial: "",
      kmFinal: "",
      fuelType: "gasolina",
      liters: "",
      fuelPrice: "",
      notes: "",
    },
  })

  React.useEffect(() => {
    if (!open) return
    form.reset({
      vehicleId: record?.vehicle_id ?? defaultVehicleId ?? "",
      logDate: record?.log_date ?? new Date().toISOString().slice(0, 10),
      kmInitial: record?.km_initial != null ? String(record.km_initial) : "",
      kmFinal: record?.km_final != null ? String(record.km_final) : "",
      fuelType: record?.fuel_type ?? "gasolina",
      liters: record?.liters != null ? String(record.liters) : "",
      fuelPrice: record?.fuel_price != null ? String(record.fuel_price) : "",
      notes: record?.notes ?? "",
    })
    setAttachments(record?.attachments ?? [])
  }, [open, record, defaultVehicleId, form])

  const liters = Number(form.watch("liters") || 0)
  const price = Number(form.watch("fuelPrice") || 0)
  const total = liters > 0 && price > 0 ? liters * price : undefined

  async function onSubmit(values: FormValues) {
    const vehicle = veiculos.find((v) => v.id === values.vehicleId)
    if (!vehicle) return
    try {
      const input = {
        vehicleId: values.vehicleId,
        vehiclePlate: vehicle.plate,
        logDate: values.logDate,
        kmInitial: Number(values.kmInitial),
        kmFinal: Number(values.kmFinal),
        liters: Number(values.liters),
        fuelPrice: Number(values.fuelPrice),
        fuelType: values.fuelType,
        notes: values.notes || undefined,
        attachments,
      }
      if (isEditing) {
        await updateLog.mutateAsync({ id: record.id, patch: input })
        toast.success("Abastecimento atualizado.")
      } else {
        await createLog.mutateAsync(input)
        toast.success("Abastecimento registrado.")
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o abastecimento.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent preventOutsideClose>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar abastecimento" : "Registrar abastecimento"}</DialogTitle>
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
                name="logDate"
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
                name="fuelType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Combustível</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FUEL_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {FUEL_TYPE_LABELS[type]}
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
                name="kmInitial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KM inicial</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kmFinal"
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
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="liters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Litros</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fuelPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço por litro</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {total != null && (
              <p className="text-sm text-muted-foreground">
                Custo total: <span className="font-medium text-foreground">{formatCurrency(total)}</span>
              </p>
            )}
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