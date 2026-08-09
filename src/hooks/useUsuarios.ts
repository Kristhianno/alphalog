import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { qk } from "./queryKeys"
import * as api from "@/mocks/api/usuarios.api"

export function useUsuariosList() {
  const { actor } = useAuth()
  return useQuery({
    queryKey: qk.usuarios.all,
    queryFn: () => api.listUsuarios(actor!),
    enabled: !!actor,
  })
}

export function useCreateUsuario() {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.CreateUsuarioInput) => api.createUsuario(input, actor!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.usuarios.all })
      queryClient.invalidateQueries({ queryKey: qk.motoristas.all })
    },
  })
}

export function useUpdateUsuario() {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: api.UpdateUsuarioInput }) =>
      api.updateUsuario(id, patch, actor!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.usuarios.all })
      queryClient.invalidateQueries({ queryKey: qk.motoristas.all })
    },
  })
}

export function useResetSenha() {
  const { actor } = useAuth()
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      api.resetSenha(id, newPassword, actor!),
  })
}

export function useDeleteUsuario() {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteUsuario(id, actor!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.usuarios.all }),
  })
}
