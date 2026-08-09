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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useResetSenha } from "@/hooks/useUsuarios"
import type { UsuarioComPapel } from "@/mocks/api/usuarios.api"

const schema = z.object({
  newPassword: z.string().min(6, "A senha deve ter ao menos 6 caracteres."),
})

type FormValues = z.infer<typeof schema>

interface ResetPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usuario?: UsuarioComPapel
}

export function ResetPasswordDialog({ open, onOpenChange, usuario }: ResetPasswordDialogProps) {
  const resetSenha = useResetSenha()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "" },
  })

  React.useEffect(() => {
    if (open) form.reset({ newPassword: "" })
  }, [open, form])

  async function onSubmit(values: FormValues) {
    if (!usuario) return
    try {
      await resetSenha.mutateAsync({ id: usuario.id, newPassword: values.newPassword })
      toast.success(`Senha de ${usuario.name} redefinida.`)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível redefinir a senha.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent preventOutsideClose>
        <DialogHeader>
          <DialogTitle>Redefinir senha</DialogTitle>
        </DialogHeader>
        {usuario && (
          <p className="-mt-2 text-sm text-muted-foreground">
            Nova senha de acesso para <span className="font-medium text-foreground">{usuario.name}</span>.
          </p>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova senha</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={resetSenha.isPending}>
                {resetSenha.isPending ? "Salvando..." : "Redefinir senha"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}