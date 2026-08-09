import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { qk, fleetLogInvalidates } from "./queryKeys"
import * as api from "@/mocks/api/manutencao.api"

export function useRegistrosManutencaoList() {
  const { actor } = useAuth()
  return useQuery({
    queryKey: qk.manutencao.all,
    queryFn: () => api.listRegistrosManutencao(actor!),
    enabled: !!actor,
  })
}

export function useCreateRegistroManutencao() {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.CreateMaintenanceInput) => api.createRegistroManutencao(input, actor!),
    onSuccess: (record) => {
      for (const key of fleetLogInvalidates(record.vehicle_id)) queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

export function useUpdateRegistroManutencao(vehicleId: string) {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<api.CreateMaintenanceInput> }) =>
      api.updateRegistroManutencao(id, patch, actor!),
    onSuccess: () => {
      for (const key of fleetLogInvalidates(vehicleId)) queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

export function useDeleteRegistroManutencao(vehicleId: string) {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteRegistroManutencao(id, actor!),
    onSuccess: () => {
      for (const key of fleetLogInvalidates(vehicleId)) queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
