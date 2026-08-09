import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { qk } from "./queryKeys"
import * as api from "@/mocks/api/veiculos.api"

export function useVeiculosList() {
  const { actor } = useAuth()
  return useQuery({
    queryKey: qk.veiculos.all,
    queryFn: () => api.listVeiculos(),
    enabled: !!actor,
  })
}

export function useCreateVeiculo() {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.CreateVeiculoInput) => api.createVeiculo(input, actor!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.veiculos.all }),
  })
}

export function useUpdateVeiculo() {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<api.CreateVeiculoInput> }) =>
      api.updateVeiculo(id, patch, actor!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.veiculos.all }),
  })
}
