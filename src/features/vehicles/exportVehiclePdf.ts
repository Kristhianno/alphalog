import { buildReport, downloadReport } from "@/lib/pdf"
import { deriveCurrentKm } from "@/domain/vehicleKm"
import { totalNegativeAnswers } from "@/domain/checklist"
import { FUEL_TYPE_LABELS, MAINTENANCE_TYPE_LABELS } from "@/lib/constants"
import { formatCurrency, formatDate, formatKm } from "@/lib/format"
import type { ChecklistVeiculo, LogCombustivel, RegistroManutencao, TrocaDeOleo, Veiculo } from "@/types/entities"

export function exportVehiclePdf(params: {
  veiculo: Veiculo
  combustivel: LogCombustivel[]
  oleo: TrocaDeOleo[]
  manutencao: RegistroManutencao[]
  checklists: ChecklistVeiculo[]
}) {
  const { veiculo, combustivel, oleo, manutencao, checklists } = params

  const gastoCombustivel = combustivel.reduce((sum, l) => sum + l.liters * l.fuel_price, 0)
  const gastoOleo = oleo.reduce((sum, l) => sum + l.service_cost, 0)
  const gastoManutencao = manutencao.reduce((sum, l) => sum + l.service_cost, 0)
  const currentKm = deriveCurrentKm({ vehicleId: veiculo.id, fuelLogs: combustivel, oilChanges: oleo, maintenanceLogs: manutencao })

  const doc = buildReport({
    title: `Relatório do Veículo — ${veiculo.plate}`,
    subtitle: `${veiculo.brand} ${veiculo.model} (${veiculo.year})`,
    summary: [
      { label: "KM atual", value: formatKm(currentKm) },
      { label: "Gasto combustível", value: formatCurrency(gastoCombustivel) },
      { label: "Gasto óleo", value: formatCurrency(gastoOleo) },
      { label: "Gasto manutenção", value: formatCurrency(gastoManutencao) },
    ],
    sections: [
      {
        heading: "Abastecimento",
        head: ["Data", "Combustível", "Litros", "Custo"],
        rows: combustivel.map((l) => [
          formatDate(l.log_date),
          FUEL_TYPE_LABELS[l.fuel_type],
          `${l.liters.toFixed(1)} L`,
          formatCurrency(l.liters * l.fuel_price),
        ]),
      },
      {
        heading: "Troca de óleo",
        head: ["Data", "Tipo", "KM troca", "Próxima troca", "Custo"],
        rows: oleo.map((l) => [
          formatDate(l.change_date),
          l.oil_type,
          formatKm(l.km_at_change),
          formatKm(l.next_change_km),
          formatCurrency(l.service_cost),
        ]),
      },
      {
        heading: "Manutenção",
        head: ["Data", "Tipo", "KM", "Custo"],
        rows: manutencao.map((l) => [
          formatDate(l.maintenance_date),
          MAINTENANCE_TYPE_LABELS[l.maintenance_type],
          formatKm(l.current_km),
          formatCurrency(l.service_cost),
        ]),
      },
      {
        heading: "Checklist",
        head: ["Data", "KM", "Itens \"Não\""],
        rows: checklists.map((l) => [formatDate(l.checklist_date), formatKm(l.current_km), String(totalNegativeAnswers(l))]),
      },
    ],
  })

  downloadReport(doc, `veiculo-${veiculo.plate}-${new Date().toISOString().slice(0, 10)}`)
}