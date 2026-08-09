import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { HelpCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
import { ROLE_LABELS, VEHICLE_TYPE_LABELS, VEHICLE_TYPE_SPECS } from "@/lib/constants"
import { ROLES, VEHICLE_TYPES, type VehicleType } from "@/types/enums"
import { useCreateUsuario, useUpdateUsuario } from "@/hooks/useUsuarios"
import type { UsuarioComPapel } from "@/mocks/api/usuarios.api"
import type { Motorista } from "@/types/entities"

const schema = z.object({
  name: z.string().min(2, "Informe o nome completo."),
  username: z
    .string()
    .min(3, "Mínimo de 3 caracteres.")
    .regex(/^[a-z0-9._-]+$/i, "Use apenas letras, números, ponto, hífen ou underline."),
  phone: z.string().optional(),
  password: z.string().optional(),
  role: z.enum(ROLES),
  enabledVehicleTypes: z.array(z.enum(VEHICLE_TYPES)),
})

type FormValues = z.infer<typeof schema>

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usuario?: UsuarioComPapel
  motorista?: Motorista
}

export function UserFormDialog({ open, onOpenChange, usuario, motorista }: UserFormDialogProps) {
  const isEditing = !!usuario
  const createUsuario = useCreateUsuario()
  const updateUsuario = useUpdateUsuario()
  const isSubmitting = createUsuario.isPending || updateUsuario.isPending

  const form = useForm<FormValues>({
    resolver: zodResolver(
      isEditing ? schema : schema.extend({ password: z.string().min(6, "Mínimo de 6 caracteres.") }),
    ),
    defaultValues: {
      name: "",
      username: "",
      phone: "",
      password: "",
      role: "cliente",
      enabledVehicleTypes: [],
    },
  })

  React.useEffect(() => {
    if (!open) return
    form.reset({
      name: usuario?.name ?? "",
      username: usuario?.username ?? "",
      phone: usuario?.phone ?? "",
      password: "",
      role: usuario?.role ?? "cliente",
      enabledVehicleTypes: motorista?.enabled_vehicle_types ?? [],
    })
  }, [open, usuario, motorista, form])

  const role = form.watch("role")

  async function onSubmit(values: FormValues) {
    try {
      if (isEditing) {
        await updateUsuario.mutateAsync({
          id: usuario.id,
          patch: {
            name: values.name,
            username: values.username,
            phone: values.phone,
            role: values.role,
            enabledVehicleTypes: values.role === "motorista" ? values.enabledVehicleTypes : [],
          },
        })
        toast.success("Usuário atualizado.")
      } else {
        await createUsuario.mutateAsync({
          name: values.name,
          username: values.username,
          phone: values.phone,
          password: values.password!,
          role: values.role,
          enabledVehicleTypes: values.role === "motorista" ? values.enabledVehicleTypes : [],
        })
        toast.success("Usuário criado.")
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o usuário.")
    }
  }

  function toggleVehicleType(type: VehicleType, checked: boolean) {
    const current = form.getValues("enabledVehicleTypes")
    form.setValue(
      "enabledVehicleTypes",
      checked ? [...current, type] : current.filter((t) => t !== type),
      { shouldDirty: true },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent preventOutsideClose>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Maria da Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuário (login)</FormLabel>
                    <FormControl>
                      <Input placeholder="maria.silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 90000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {!isEditing && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Papel</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {role === "motorista" && (
              <div className="space-y-2">
                <Label>Tipos de veículo habilitados</Label>
                <div className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 sm:grid-cols-2">
                  {VEHICLE_TYPES.map((type) => {
                    const checked = form.watch("enabledVehicleTypes").includes(type)
                    const spec = VEHICLE_TYPE_SPECS[type]
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <Checkbox
                          id={`vt-${type}`}
                          checked={checked}
                          onCheckedChange={(value) => toggleVehicleType(type, value === true)}
                        />
                        <Label htmlFor={`vt-${type}`} className="flex-1 cursor-pointer font-normal">
                          {VEHICLE_TYPE_LABELS[type]}
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              aria-label={`Especificações de ${VEHICLE_TYPE_LABELS[type]}`}
                            >
                              <HelpCircle className="size-3.5" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 text-sm">
                            <p className="font-medium">{VEHICLE_TYPE_LABELS[type]}</p>
                            <p className="mt-1 text-muted-foreground">{spec.description}</p>
                            <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-muted-foreground">
                              <dt>Capacidade</dt>
                              <dd className="text-right text-foreground">{spec.capacity} kg</dd>
                              <dt>Dimensões (C×L×A)</dt>
                              <dd className="text-right text-foreground">
                                {spec.length}×{spec.width}×{spec.height} m
                              </dd>
                            </dl>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )
                  })}
                </div>
              </div>
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