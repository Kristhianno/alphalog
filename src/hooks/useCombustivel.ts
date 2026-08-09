import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { qk, fleetLogInvalidates } from "./queryKeys"
import * as api from "@/mocks/api/combustivel.api"

export function useCombustivelList() {
  const { actor } = useAuth()
  return useQuery({
    queryKey: qk.combustivel.all,
    queryFn: () => api.listLogsCombustivel(actor!),
    enabled: !!actor,
  })
}

function useInvalidateFleet(vehicleId: string) {
  const queryClient = useQueryClient()
  return () => {
    for (const key of fleetLogInvalidates(vehicleId)) queryClient.invalidateQueries({ queryKey: key })
  }
}

export function useCreateLogCombustivel() {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.CreateFuelLogInput) => api.createLogCombustivel(input, actor!),
    onSuccess: (record) => {
      for (const key of fleetLogInvalidates(record.vehicle_id)) queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

export function useUpdateLogCombustivel(vehicleId: string) {
  const { actor } = useAuth()
  const invalidate = useInvalidateFleet(vehicleId)
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<api.CreateFuelLogInput> }) =>
      api.updateLogCombustivel(id, patch, actor!),
    onSuccess: invalidate,
  })
}

export function useDeleteLogCombustivel(vehicleId: string) {
  const { actor } = useAuth()
  const invalidate = useInvalidateFleet(vehicleId)
  return useMutation({
    mutationFn: (id: string) => api.deleteLogCombustivel(id, actor!),
    onSuccess: invalidate,
  })
}
