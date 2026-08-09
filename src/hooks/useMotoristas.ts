import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { qk } from "./queryKeys"
import * as api from "@/mocks/api/motoristas.api"

export function useMotoristasList() {
  const { actor } = useAuth()
  return useQuery({
    queryKey: qk.motoristas.all,
    queryFn: () => api.listMotoristas(),
    enabled: !!actor,
  })
}

export function useUpdateMotoristaDocumentos() {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof api.updateMotoristaDocumentos>[1] }) =>
      api.updateMotoristaDocumentos(id, patch, actor!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.motoristas.all }),
  })
}
