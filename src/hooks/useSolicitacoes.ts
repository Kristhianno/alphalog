import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { qk, SOLICITACAO_MUTATION_INVALIDATES } from "./queryKeys"
import * as api from "@/mocks/api/solicitacoes.api"
import type { Attachment } from "@/types/entities"
import type { RequestStatus } from "@/types/enums"

export function useSolicitacoesList() {
  const { actor } = useAuth()
  return useQuery({
    queryKey: qk.solicitacoes.all,
    queryFn: () => api.listSolicitacoes(actor!),
    enabled: !!actor,
  })
}

export function useSolicitacao(id: string | undefined) {
  const { actor } = useAuth()
  return useQuery({
    queryKey: qk.solicitacoes.detail(id ?? ""),
    queryFn: () => api.getSolicitacao(id!, actor!),
    enabled: !!actor && !!id,
  })
}

export function useHistoricoSolicitacao(requestId: string | undefined) {
  return useQuery({
    queryKey: qk.solicitacoes.historico(requestId ?? ""),
    queryFn: () => api.getHistorico(requestId!),
    enabled: !!requestId,
  })
}

function useInvalidateAfterMutation() {
  const queryClient = useQueryClient()
  return () => {
    for (const key of SOLICITACAO_MUTATION_INVALIDATES) {
      queryClient.invalidateQueries({ queryKey: key })
    }
  }
}

export function useCreateSolicitacao() {
  const { actor, session } = useAuth()
  const invalidate = useInvalidateAfterMutation()
  return useMutation({
    mutationFn: (input: api.CreateSolicitacaoInput) =>
      api.createSolicitacao(input, actor!, session!.user.name),
    onSuccess: invalidate,
  })
}

export function useUpdateSolicitacao() {
  const { actor } = useAuth()
  const invalidate = useInvalidateAfterMutation()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: api.SolicitacaoPatch }) =>
      api.updateSolicitacao(id, patch, actor!),
    onSuccess: invalidate,
  })
}

export function useChangeSolicitacaoStatus() {
  const { actor, session } = useAuth()
  const invalidate = useInvalidateAfterMutation()
  return useMutation({
    mutationFn: ({
      id,
      target,
      notes,
      attachments,
    }: {
      id: string
      target: RequestStatus
      notes?: string
      attachments?: Attachment[]
    }) => api.changeSolicitacaoStatus(id, target, actor!, session!.user.name, { notes, attachments }),
    onSuccess: invalidate,
  })
}

export function useAcceptSolicitacao() {
  const { actor, session } = useAuth()
  const invalidate = useInvalidateAfterMutation()
  return useMutation({
    mutationFn: (id: string) => api.acceptSolicitacao(id, actor!, session!.user.name),
    onSuccess: invalidate,
  })
}

export function useCancelSolicitacao() {
  const { actor, session } = useAuth()
  const invalidate = useInvalidateAfterMutation()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.cancelSolicitacao(id, reason, actor!, session!.user.name),
    onSuccess: invalidate,
  })
}

export function useDeleteSolicitacao() {
  const { actor } = useAuth()
  const invalidate = useInvalidateAfterMutation()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.deleteSolicitacao(id, reason, actor!),
    onSuccess: invalidate,
  })
}
