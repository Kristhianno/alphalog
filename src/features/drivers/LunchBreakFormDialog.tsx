import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { AttachmentField } from "@/components/shared/AttachmentField"
import { useCreatePausaAlmoco, useUpdatePausaAlmoco } from "@/hooks/usePausasAlmoco"
import type { Attachment, PausaAlmoco } from "@/types/entities"

const schema = z.object({
  breakDate: z.string().min(1, "Informe a data."),
  exitTime: z.string().min(1, "Informe a hora de saída."),
  returnTime: z.string().optional(),
  valor: z.string().optional(),
  observacoes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface LunchBreakFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: PausaAlmoco
}

export function LunchBreakFormDialog({ open, onOpenChange, record }: LunchBreakFormDialogProps) {
  const { session } = useAuth()
  const isEditing = !!record
  const createPausa = useCreatePausaAlmoco()
  const updatePausa = useUpdatePausaAlmoco()
  const isSubmitting = createPausa.isPending || updatePausa.isPending
  const [attachments, setAttachments] = React.useState<Attachment[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { breakDate: "", exitTime: "", returnTime: "", valor: "", observacoes: "" },
  })

  React.useEffect(() => {
    if (!open) return
    form.reset({
      breakDate: record?.break_date ?? new Date().toISOString().slice(0, 10),
      exitTime: record?.exit_time ?? "",
      returnTime: record?.return_time ?? "",
      valor: record?.valor != null ? String(record.valor) : "",
      observacoes: record?.observacoes ?? "",
    })
    setAttachments(record?.attachments ?? [])
  }, [open, record, form])

  async function onSubmit(values: FormValues) {
    try {
      const input = {
        employeeName: session!.user.name,
        breakDate: values.breakDate,
        exitTime: values.exitTime,
        returnTime: values.returnTime || undefined,
        observacoes: values.observacoes || undefined,
        attachments,
        valor: values.valor?.trim() ? Number(values.valor) : undefined,
      }
      if (isEditing) {
        await updatePausa.mutateAsync({ id: record.id, patch: input })
        toast.success("Registro de almoço atualizado.")
      } else {
        await createPausa.mutateAsync(input)
        toast.success("Pausa de almoço registrada.")
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o registro.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent preventOutsideClose>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar pausa de almoço" : "Registrar pausa de almoço"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="breakDate"
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
                name="exitTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de saída</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="returnTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de retorno</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="valor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (opcional)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0,00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="observacoes"
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
            <AttachmentField label="Comprovante (opcional)" value={attachments} onChange={setAttachments} />
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