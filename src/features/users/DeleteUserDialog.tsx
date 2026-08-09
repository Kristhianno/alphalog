import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useDeleteUsuario } from "@/hooks/useUsuarios"
import type { UsuarioComPapel } from "@/mocks/api/usuarios.api"

interface DeleteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usuario?: UsuarioComPapel
}

export function DeleteUserDialog({ open, onOpenChange, usuario }: DeleteUserDialogProps) {
  const deleteUsuario = useDeleteUsuario()

  async function handleConfirm() {
    if (!usuario) return
    try {
      await deleteUsuario.mutateAsync(usuario.id)
      toast.success(`Usuário ${usuario.name} excluído.`)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o usuário.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent preventOutsideClose>
        <DialogHeader>
          <DialogTitle>Excluir usuário</DialogTitle>
          <DialogDescription>
            Esta ação remove definitivamente a conta de{" "}
            <span className="font-medium text-foreground">{usuario?.name}</span> e não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteUsuario.isPending}
          >
            {deleteUsuario.isPending ? "Excluindo..." : "Excluir definitivamente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}