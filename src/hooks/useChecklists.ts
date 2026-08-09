import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { qk } from "./queryKeys"
import * as api from "@/mocks/api/checklists.api"

export function useChecklistsList() {
  const { actor } = useAuth()
  return useQuery({
    queryKey: qk.checklists.all,
    queryFn: () => api.listChecklists(actor!),
    enabled: !!actor,
  })
}

export function useCreateChecklist() {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.CreateChecklistInput) => api.createChecklist(input, actor!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.checklists.all }),
  })
}

export function useUpdateChecklist() {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<api.CreateChecklistInput> }) =>
      api.updateChecklist(id, patch, actor!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.checklists.all }),
  })
}

export function useDeleteChecklist() {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteChecklist(id, actor!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.checklists.all }),
  })
}
