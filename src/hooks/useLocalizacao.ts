import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { qk } from "./queryKeys"
import { getLocalizacaoMotorista, listLocalizacoes } from "@/mocks/api/localizacao.api"

export function useLocalizacoesList() {
  const { actor } = useAuth()
  return useQuery({
    queryKey: qk.localizacao.all,
    queryFn: () => listLocalizacoes(),
    enabled: !!actor,
  })
}

/**
 * Repescagem periódica curta como reforço ao "tempo real" (regra 11) — o backend mock
 * não empurra atualizações, então o polling é o que garante a tela não ficar parada.
 */
export function useLocalizacaoMotorista(driverId: string | undefined) {
  return useQuery({
    queryKey: qk.localizacao.detail(driverId ?? ""),
    queryFn: () => getLocalizacaoMotorista(driverId!),
    enabled: !!driverId,
    refetchInterval: driverId ? 5000 : false,
  })
}
