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
import { Separator } from "@/components/ui/separator"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { AttachmentField } from "@/components/shared/AttachmentField"
import { useUpdateMotoristaDocumentos } from "@/hooks/useMotoristas"
import { useUpdateVeiculo } from "@/hooks/useVeiculos"
import type { Attachment, Motorista, Veiculo } from "@/types/entities"

const schema = z.object({
  licenseNumber: z.string().min(1, "Informe o número da habilitação."),
  cnhCategory: z.string().min(1, "Informe a categoria."),
  cnhValidUntil: z.string().min(1, "Informe a validade."),
})

type FormValues = z.infer<typeof schema>

interface DriverDocumentsDialogProps {
  motorista: Motorista | undefined
  veiculo: Veiculo | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DriverDocumentsDialog({ motorista, veiculo, open, onOpenChange }: DriverDocumentsDialogProps) {
  const updateMotorista = useUpdateMotoristaDocumentos()
  const updateVeiculo = useUpdateVeiculo()
  const [cnhAttachment, setCnhAttachment] = React.useState<Attachment | undefined>(undefined)
  const [vehicleAttachment, setVehicleAttachment] = React.useState<Attachment | undefined>(undefined)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { licenseNumber: "", cnhCategory: "", cnhValidUntil: "" },
  })

  React.useEffect(() => {
    if (!open || !motorista) return
    form.reset({
      licenseNumber: motorista.license_number,
      cnhCategory: motorista.cnh_category,
      cnhValidUntil: motorista.cnh_valid_until,
    })
    setCnhAttachment(motorista.cnh_attachment)
    setVehicleAttachment(veiculo?.document_attachment)
  }, [open, motorista, veiculo, form])

  async function onSubmit(values: FormValues) {
    if (!motorista) return
    try {
      await updateMotorista.mutateAsync({
        id: motorista.id,
        patch: {
          licenseNumber: values.licenseNumber,
          cnhCategory: values.cnhCategory,
          cnhValidUntil: values.cnhValidUntil,
          cnhAttachment: cnhAttachment,
        },
      })
      if (veiculo) {
        await updateVeiculo.mutateAsync({ id: veiculo.id, patch: { document_attachment: vehicleAttachment } })
      }
      toast.success("Documentação atualizada.")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a documentação.")
    }
  }

  const isSubmitting = updateMotorista.isPending || updateVeiculo.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent preventOutsideClose>
        <DialogHeader>
          <DialogTitle>Documentação — {motorista?.name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <p className="text-sm font-medium">Habilitação (CNH)</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cnhCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <FormControl>
                      <Input placeholder="B, C, D..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="cnhValidUntil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Validade</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <AttachmentField
              label="Anexo da CNH"
              value={cnhAttachment ? [cnhAttachment] : []}
              onChange={(list) => setCnhAttachment(list.at(-1))}
            />

            <Separator />

            <p className="text-sm font-medium">Documento do veículo {veiculo ? `(${veiculo.plate})` : ""}</p>
            {veiculo ? (
              <AttachmentField
                label="Anexo do documento (CRLV)"
                value={vehicleAttachment ? [vehicleAttachment] : []}
                onChange={(list) => setVehicleAttachment(list.at(-1))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Motorista sem veículo vinculado.</p>
            )}

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