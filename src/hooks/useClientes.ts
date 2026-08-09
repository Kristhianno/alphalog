import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { qk } from "./queryKeys"
import * as api from "@/mocks/api/clientes.api"

export function useClientesList() {
  const { actor } = useAuth()
  return useQuery({
    queryKey: qk.clientes.all,
    queryFn: () => api.listClientes(),
    enabled: !!actor,
  })
}

export function useCreateCliente() {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.CreateClienteInput) => api.createCliente(input, actor!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.clientes.all }),
  })
}

export function useUpdateCliente() {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<api.CreateClienteInput> }) =>
      api.updateCliente(id, patch, actor!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.clientes.all }),
  })
}
