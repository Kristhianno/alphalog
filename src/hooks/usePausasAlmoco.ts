import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { qk } from "./queryKeys"
import * as api from "@/mocks/api/pausasAlmoco.api"

export function usePausasAlmocoList() {
  const { actor } = useAuth()
  return useQuery({
    queryKey: qk.pausasAlmoco.all,
    queryFn: () => api.listPausasAlmoco(actor!),
    enabled: !!actor,
  })
}

export function useCreatePausaAlmoco() {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.CreateLunchBreakInput) => api.createPausaAlmoco(input, actor!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.pausasAlmoco.all }),
  })
}

export function useUpdatePausaAlmoco() {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<api.CreateLunchBreakInput> }) =>
      api.updatePausaAlmoco(id, patch, actor!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.pausasAlmoco.all }),
  })
}

export function useDeletePausaAlmoco() {
  const { actor } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deletePausaAlmoco(id, actor!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.pausasAlmoco.all }),
  })
}
