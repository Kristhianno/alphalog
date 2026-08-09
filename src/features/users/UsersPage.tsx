import * as React from "react"
import { MoreHorizontal, Plus, Search, UserRound } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useUsuariosList } from "@/hooks/useUsuarios"
import { useMotoristasList } from "@/hooks/useMotoristas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ROLES, type Role } from "@/types/enums"
import { ROLE_AVATAR_CLASSES, ROLE_LABELS, VEHICLE_TYPE_LABELS } from "@/lib/constants"
import { formatDate, initials } from "@/lib/format"
import { UserFormDialog } from "./UserFormDialog"
import { ResetPasswordDialog } from "./ResetPasswordDialog"
import { DeleteUserDialog } from "./DeleteUserDialog"
import type { UsuarioComPapel } from "@/mocks/api/usuarios.api"
import type { Motorista } from "@/types/entities"

type RoleFilter = Role | "todos"

export function UsersPage() {
  const { actor } = useAuth()
  const { data: usuarios, isLoading } = useUsuariosList()
  const { data: motoristas } = useMotoristasList()

  const [search, setSearch] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>("todos")
  const [formOpen, setFormOpen] = React.useState(false)
  const [resetOpen, setResetOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<UsuarioComPapel | undefined>(undefined)

  const motoristaByUserId = React.useMemo(() => {
    const map = new Map<string, Motorista>()
    for (const m of motoristas ?? []) {
      if (m.user_id) map.set(m.user_id, m)
    }
    return map
  }, [motoristas])

  const counts = React.useMemo(() => {
    const base = Object.fromEntries(ROLES.map((r) => [r, 0])) as Record<Role, number>
    for (const u of usuarios ?? []) base[u.role]++
    return base
  }, [usuarios])

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return (usuarios ?? []).filter((u) => {
      if (roleFilter !== "todos" && u.role !== roleFilter) return false
      if (!query) return true
      return (
        u.name.toLowerCase().includes(query) ||
        (u.phone ?? "").toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.username ?? "").toLowerCase().includes(query)
      )
    })
  }, [usuarios, search, roleFilter])

  function openCreate() {
    setSelected(undefined)
    setFormOpen(true)
  }

  function openEdit(usuario: UsuarioComPapel) {
    setSelected(usuario)
    setFormOpen(true)
  }

  function openReset(usuario: UsuarioComPapel) {
    setSelected(usuario)
    setResetOpen(true)
  }

  function openDelete(usuario: UsuarioComPapel) {
    setSelected(usuario)
    setDeleteOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ROLES.map((role) => (
          <Card key={role}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {ROLE_LABELS[role]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-10" />
              ) : (
                <p className="text-2xl font-semibold">{counts[role]}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou e-mail..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os papéis</SelectItem>
              {ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          Novo usuário
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <UserRound className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Veículos habilitados</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((usuario) => (
                  <UserRow
                    key={usuario.id}
                    usuario={usuario}
                    motorista={motoristaByUserId.get(usuario.id)}
                    isSelf={usuario.id === actor?.userId}
                    canDelete={actor?.role === "admin"}
                    onEdit={() => openEdit(usuario)}
                    onReset={() => openReset(usuario)}
                    onDelete={() => openDelete(usuario)}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {filtered.map((usuario) => (
              <UserCard
                key={usuario.id}
                usuario={usuario}
                motorista={motoristaByUserId.get(usuario.id)}
                isSelf={usuario.id === actor?.userId}
                canDelete={actor?.role === "admin"}
                onEdit={() => openEdit(usuario)}
                onReset={() => openReset(usuario)}
                onDelete={() => openDelete(usuario)}
              />
            ))}
          </div>
        </>
      )}

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        usuario={selected}
        motorista={selected ? motoristaByUserId.get(selected.id) : undefined}
      />
      <ResetPasswordDialog open={resetOpen} onOpenChange={setResetOpen} usuario={selected} />
      <DeleteUserDialog open={deleteOpen} onOpenChange={setDeleteOpen} usuario={selected} />
    </div>
  )
}

interface RowProps {
  usuario: UsuarioComPapel
  motorista: Motorista | undefined
  isSelf: boolean
  canDelete: boolean
  onEdit: () => void
  onReset: () => void
  onDelete: () => void
}

function UserActionsMenu({ isSelf, canDelete, onEdit, onReset, onDelete }: RowProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ações">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>Editar</DropdownMenuItem>
        <DropdownMenuItem onSelect={onReset}>Redefinir senha</DropdownMenuItem>
        {!isSelf && canDelete && (
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            Excluir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UserRow(props: RowProps) {
  const { usuario, motorista } = props
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className={ROLE_AVATAR_CLASSES[usuario.role]}>
              {initials(usuario.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{usuario.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {usuario.username ?? usuario.email}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{usuario.phone || "—"}</TableCell>
      <TableCell>
        <Badge variant="outline">{ROLE_LABELS[usuario.role]}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {usuario.role === "motorista"
          ? motorista?.enabled_vehicle_types.length
            ? motorista.enabled_vehicle_types.map((t) => VEHICLE_TYPE_LABELS[t]).join(", ")
            : "Nenhum definido"
          : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">{formatDate(usuario.created_at)}</TableCell>
      <TableCell>
        <UserActionsMenu {...props} />
      </TableCell>
    </TableRow>
  )
}

function UserCard(props: RowProps) {
  const { usuario, motorista } = props
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <Avatar>
          <AvatarFallback className={ROLE_AVATAR_CLASSES[usuario.role]}>
            {initials(usuario.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{usuario.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {usuario.username ?? usuario.email}
              </p>
            </div>
            <UserActionsMenu {...props} />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="outline">{ROLE_LABELS[usuario.role]}</Badge>
            {usuario.phone && <span className="text-xs text-muted-foreground">{usuario.phone}</span>}
          </div>
          {usuario.role === "motorista" && (
            <p className="text-xs text-muted-foreground">
              Veículos:{" "}
              {motorista?.enabled_vehicle_types.length
                ? motorista.enabled_vehicle_types.map((t) => VEHICLE_TYPE_LABELS[t]).join(", ")
                : "Nenhum definido"}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Cadastrado em {formatDate(usuario.created_at)}</p>
        </div>
      </CardContent>
    </Card>
  )
}