import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { qk } from "./queryKeys"
import { listTiposDeMaterial } from "@/mocks/api/materiais.api"

export function useTiposDeMaterialList() {
  const { actor } = useAuth()
  return useQuery({
    queryKey: qk.materiais.all,
    queryFn: () => listTiposDeMaterial(),
    enabled: !!actor,
  })
}
