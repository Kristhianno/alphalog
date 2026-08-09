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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
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
import { useCreateChecklist, useUpdateChecklist } from "@/hooks/useChecklists"
import {
  MATERIALS_CHECKLIST_ITEMS,
  VEHICLE_CHECKLIST_ITEMS,
  buildEmptyChecklistGroup,
  countNegativeAnswers,
} from "@/domain/checklist"
import type { Attachment, ChecklistItemResposta, ChecklistVeiculo, Veiculo } from "@/types/entities"

const schema = z.object({
  vehicleId: z.string().min(1, "Selecione o veículo."),
  checklistDate: z.string().min(1, "Informe a data."),
  currentKm: z.string().min(1, "Informe o KM atual."),
})

type FormValues = z.infer<typeof schema>

interface ChecklistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  veiculos: Veiculo[]
  defaultVehicleId?: string
  record?: ChecklistVeiculo
}

export function ChecklistDialog({ open, onOpenChange, veiculos, defaultVehicleId, record }: ChecklistDialogProps) {
  const isEditing = !!record
  const createChecklist = useCreateChecklist()
  const updateChecklist = useUpdateChecklist()
  const isSubmitting = createChecklist.isPending || updateChecklist.isPending

  const [materiaisItems, setMateriaisItems] = React.useState<ChecklistItemResposta[]>(
    buildEmptyChecklistGroup(MATERIALS_CHECKLIST_ITEMS),
  )
  const [veiculoItems, setVeiculoItems] = React.useState<ChecklistItemResposta[]>(
    buildEmptyChecklistGroup(VEHICLE_CHECKLIST_ITEMS),
  )
  const [materiaisObs, setMateriaisObs] = React.useState("")
  const [veiculoObs, setVeiculoObs] = React.useState("")
  const [materiaisAttachments, setMateriaisAttachments] = React.useState<Attachment[]>([])
  const [veiculoAttachments, setVeiculoAttachments] = React.useState<Attachment[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { vehicleId: "", checklistDate: "", currentKm: "" },
  })

  React.useEffect(() => {
    if (!open) return
    form.reset({
      vehicleId: record?.vehicle_id ?? defaultVehicleId ?? "",
      checklistDate: record?.checklist_date ?? new Date().toISOString().slice(0, 10),
      currentKm: record?.current_km != null ? String(record.current_km) : "",
    })
    setMateriaisItems(record?.materiais ?? buildEmptyChecklistGroup(MATERIALS_CHECKLIST_ITEMS))
    setVeiculoItems(record?.veiculo ?? buildEmptyChecklistGroup(VEHICLE_CHECKLIST_ITEMS))
    setMateriaisObs(record?.materiais_observacoes ?? "")
    setVeiculoObs(record?.veiculo_observacoes ?? "")
    setMateriaisAttachments(record?.materiais_attachments ?? [])
    setVeiculoAttachments(record?.veiculo_attachments ?? [])
  }, [open, record, defaultVehicleId, form])

  async function onSubmit(values: FormValues) {
    const vehicle = veiculos.find((v) => v.id === values.vehicleId)
    if (!vehicle) return
    try {
      const input = {
        vehicleId: values.vehicleId,
        vehiclePlate: vehicle.plate,
        checklistDate: values.checklistDate,
        currentKm: Number(values.currentKm),
        materiais: materiaisItems,
        materiaisObservacoes: materiaisObs || undefined,
        materiaisAttachments,
        veiculo: veiculoItems,
        veiculoObservacoes: veiculoObs || undefined,
        veiculoAttachments,
      }
      if (isEditing) {
        await updateChecklist.mutateAsync({ id: record.id, patch: input })
        toast.success("Checklist atualizado.")
      } else {
        await createChecklist.mutateAsync(input)
        toast.success("Checklist registrado.")
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o checklist.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent preventOutsideClose className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar checklist veicular" : "Novo checklist veicular"}</DialogTitle>
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
                name="checklistDate"
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
            </div>

            <Tabs defaultValue="materiais">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="materiais">
                  Materiais
                  {countNegativeAnswers(materiaisItems) > 0 && (
                    <Badge variant="destructive" className="ml-1.5 px-1.5">
                      {countNegativeAnswers(materiaisItems)}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="veiculo">
                  Veículo
                  {countNegativeAnswers(veiculoItems) > 0 && (
                    <Badge variant="destructive" className="ml-1.5 px-1.5">
                      {countNegativeAnswers(veiculoItems)}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="materiais" className="space-y-3">
                <ChecklistItemList items={materiaisItems} onChange={setMateriaisItems} />
                <Textarea
                  placeholder="Observações gerais sobre materiais (opcional)"
                  rows={2}
                  value={materiaisObs}
                  onChange={(e) => setMateriaisObs(e.target.value)}
                />
                <AttachmentField label="Anexos" value={materiaisAttachments} onChange={setMateriaisAttachments} />
              </TabsContent>
              <TabsContent value="veiculo" className="space-y-3">
                <ChecklistItemList items={veiculoItems} onChange={setVeiculoItems} />
                <Textarea
                  placeholder="Observações gerais sobre o veículo (opcional)"
                  rows={2}
                  value={veiculoObs}
                  onChange={(e) => setVeiculoObs(e.target.value)}
                />
                <AttachmentField label="Anexos" value={veiculoAttachments} onChange={setVeiculoAttachments} />
              </TabsContent>
            </Tabs>

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

function ChecklistItemList({
  items,
  onChange,
}: {
  items: ChecklistItemResposta[]
  onChange: (items: ChecklistItemResposta[]) => void
}) {
  function updateItem(index: number, patch: Partial<ChecklistItemResposta>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  return (
    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
      {items.map((item, index) => (
        <div key={item.id} className="space-y-1.5 rounded-md border border-border p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm">{item.label}</p>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                size="sm"
                variant={item.status === "sim" ? "default" : "outline"}
                onClick={() => updateItem(index, { status: "sim" })}
              >
                Sim
              </Button>
              <Button
                type="button"
                size="sm"
                variant={item.status === "nao" ? "destructive" : "outline"}
                onClick={() => updateItem(index, { status: "nao" })}
              >
                Não
              </Button>
            </div>
          </div>
          <Input
            placeholder="Observação (opcional)"
            className="h-8 text-xs"
            value={item.note ?? ""}
            onChange={(e) => updateItem(index, { note: e.target.value })}
          />
        </div>
      ))}
    </div>
  )
}