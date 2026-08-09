import { useQuery } from "@tanstack/react-query"
import { qk } from "./queryKeys"
import { getLocalizacaoMotorista } from "@/mocks/api/localizacao.api"

export function useLocalizacaoMotorista(driverId: string | undefined) {
  return useQuery({
    queryKey: qk.localizacao.detail(driverId ?? ""),
    queryFn: () => getLocalizacaoMotorista(driverId!),
    enabled: !!driverId,
  })
}
