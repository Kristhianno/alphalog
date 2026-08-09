import * as React from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUpdateSolicitacao } from "@/hooks/useSolicitacoes"
import type { Motorista, Solicitacao } from "@/types/entities"

const UNASSIGNED = "__unassigned__"

/** Edição rápida do motorista atribuído, direto na linha do Painel (doc/04, sem abrir modal). */
export function InlineDriverCell({ request, motoristas }: { request: Solicitacao; motoristas: Motorista[] }) {
  const updateSolicitacao = useUpdateSolicitacao()

  const compatible = motoristas.filter((m) => m.enabled_vehicle_types.includes(request.transport_type))
  const currentStillListed = compatible.some((m) => m.id === request.driver_id)
  const current = motoristas.find((m) => m.id === request.driver_id)
  const options = !currentStillListed && current ? [current, ...compatible] : compatible

  function handleChange(value: string) {
    const driverId = value === UNASSIGNED ? undefined : value
    if (driverId === request.driver_id) return
    const driver = motoristas.find((m) => m.id === driverId)
    updateSolicitacao.mutate(
      { id: request.id, patch: { driver_id: driverId, vehicle_id: driver?.vehicle_id } },
      {
        onSuccess: () => toast.success("Motorista atualizado."),
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o motorista."),
      },
    )
  }

  return (
    <Select value={request.driver_id ?? UNASSIGNED} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-40 text-xs" onClick={(e) => e.stopPropagation()}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        <SelectItem value={UNASSIGNED}>Sem motorista</SelectItem>
        {options.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Edição rápida do valor de frete, direto na linha do Painel. */
export function InlineFreightCell({ request }: { request: Solicitacao }) {
  const updateSolicitacao = useUpdateSolicitacao()
  const [value, setValue] = React.useState(
    request.freight_override != null ? String(request.freight_override) : "",
  )

  React.useEffect(() => {
    setValue(request.freight_override != null ? String(request.freight_override) : "")
  }, [request.id, request.freight_override])

  function handleBlur() {
    const trimmed = value.trim()
    const parsed = trimmed ? Number(trimmed) : undefined
    if (trimmed && Number.isNaN(parsed)) {
      toast.error("Valor de frete inválido.")
      setValue(request.freight_override != null ? String(request.freight_override) : "")
      return
    }
    if (parsed === request.freight_override) return
    updateSolicitacao.mutate(
      { id: request.id, patch: { freight_override: parsed } },
      {
        onSuccess: () => toast.success("Frete atualizado."),
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o frete.")
          setValue(request.freight_override != null ? String(request.freight_override) : "")
        },
      },
    )
  }

  return (
    <Input
      type="number"
      step="0.01"
      placeholder="Tabela"
      className="h-8 w-24 text-xs"
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
    />
  )
}