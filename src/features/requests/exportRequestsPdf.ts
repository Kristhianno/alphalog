import { buildReport, downloadReport } from "@/lib/pdf"
import { resolveFreight } from "@/domain/pricing"
import { STATUS_LABELS } from "@/domain/requestStatus"
import { VEHICLE_TYPE_LABELS } from "@/lib/constants"
import { formatCurrency, formatDate } from "@/lib/format"
import { REQUEST_STATUSES } from "@/types/enums"
import type { PrecoDeFrete, Solicitacao } from "@/types/entities"

export function exportSolicitacoesPdf(params: {
  requests: Solicitacao[]
  subtitle?: string
  clienteById: Map<string, string>
  materialById: Map<string, string>
  motoristaById: Map<string, string>
  precos: PrecoDeFrete[]
}) {
  const { requests, precos } = params

  const statusCounts = REQUEST_STATUSES.reduce<Record<string, number>>((acc, status) => {
    acc[status] = requests.filter((r) => r.status === status).length
    return acc
  }, {})

  const totalFrete = requests.reduce((sum, r) => {
    const { price } = resolveFreight({
      clientId: r.client_id,
      transportType: r.transport_type,
      originAddress: r.origin_address,
      destinationAddress: r.destination_address,
      freightOverride: r.freight_override,
      priceTable: precos,
    })
    return sum + (price ?? 0)
  }, 0)

  const summary = [
    { label: "Total", value: String(requests.length) },
    ...REQUEST_STATUSES.filter((s) => statusCounts[s] > 0).map((s) => ({
      label: STATUS_LABELS[s],
      value: String(statusCounts[s]),
    })),
    { label: "Total de frete", value: formatCurrency(totalFrete) },
  ]

  const rows = requests.map((r) => {
    const { price } = resolveFreight({
      clientId: r.client_id,
      transportType: r.transport_type,
      originAddress: r.origin_address,
      destinationAddress: r.destination_address,
      freightOverride: r.freight_override,
      priceTable: precos,
    })
    return [
      `#${r.request_number}`,
      params.clienteById.get(r.client_id) ?? "—",
      params.motoristaById.get(r.driver_id ?? "") ?? "—",
      params.materialById.get(r.material_type_id) ?? "—",
      VEHICLE_TYPE_LABELS[r.transport_type],
      STATUS_LABELS[r.status],
      formatDate(r.created_at),
      formatCurrency(price),
    ]
  })

  const doc = buildReport({
    title: "Relatório de Solicitações",
    subtitle: params.subtitle,
    summary,
    sections: [
      {
        head: ["#", "Cliente", "Motorista", "Material", "Transporte", "Status", "Data", "Frete"],
        rows,
      },
    ],
  })

  downloadReport(doc, `solicitacoes-${new Date().toISOString().slice(0, 10)}`)
}