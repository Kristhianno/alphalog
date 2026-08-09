import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { qk, fleetLogInvalidates } from "./queryKeys"
import * as api from "@/mocks/api/oleo.api"

export function useTrocasDeOleoList() {
  const { actor } = useAuth()
  return useQuery({
    queryKey: qk.oleo.all,
    queryFn: () => api.listTrocasDeOleo(actor!),
    enabled: !!actor,
  })
}

export function useCreateTrocaDeOleo() {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.CreateOilChangeInput) => api.createTrocaDeOleo(input, actor!),
    onSuccess: (record) => {
      for (const key of fleetLogInvalidates(record.vehicle_id)) queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

export function useUpdateTrocaDeOleo(vehicleId: string) {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<api.CreateOilChangeInput> }) =>
      api.updateTrocaDeOleo(id, patch, actor!),
    onSuccess: () => {
      for (const key of fleetLogInvalidates(vehicleId)) queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

export function useDeleteTrocaDeOleo(vehicleId: string) {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteTrocaDeOleo(id, actor!),
    onSuccess: () => {
      for (const key of fleetLogInvalidates(vehicleId)) queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
