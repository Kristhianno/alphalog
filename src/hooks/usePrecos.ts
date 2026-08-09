import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { qk } from "./queryKeys"
import * as api from "@/mocks/api/precos.api"

export function usePrecosList() {
  const { actor } = useAuth()
  return useQuery({
    queryKey: qk.precos.all,
    queryFn: () => api.listPrecos(actor!),
    enabled: !!actor,
  })
}

export function useUpsertPreco() {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.UpsertPrecoInput) => api.upsertPreco(input, actor!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.precos.all }),
  })
}

export function useDeletePreco() {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deletePreco(id, actor!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.precos.all }),
  })
}
