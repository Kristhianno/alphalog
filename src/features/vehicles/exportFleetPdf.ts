import { buildReport, downloadReport } from "@/lib/pdf"
import { deriveCurrentKm, isOilChangeOverdue } from "@/domain/vehicleKm"
import { VEHICLE_TYPE_LABELS } from "@/lib/constants"
import { formatCurrency, formatKm } from "@/lib/format"
import type { LogCombustivel, RegistroManutencao, TrocaDeOleo, Veiculo } from "@/types/entities"

export function exportFleetPdf(params: {
  veiculos: Veiculo[]
  combustivel: LogCombustivel[]
  oleo: TrocaDeOleo[]
  manutencao: RegistroManutencao[]
}) {
  const { veiculos, combustivel, oleo, manutencao } = params

  const litersTotal = combustivel.reduce((sum, l) => sum + l.liters, 0)
  const gastoTotal =
    combustivel.reduce((sum, l) => sum + l.liters * l.fuel_price, 0) +
    oleo.reduce((sum, l) => sum + l.service_cost, 0) +
    manutencao.reduce((sum, l) => sum + l.service_cost, 0)
  const kmTotal = combustivel.reduce((sum, l) => sum + Math.max(0, l.km_final - l.km_initial), 0)
  const consumoMedio = litersTotal > 0 ? kmTotal / litersTotal : 0

  const rows = veiculos.map((v) => {
    const currentKm = deriveCurrentKm({ vehicleId: v.id, fuelLogs: combustivel, oilChanges: oleo, maintenanceLogs: manutencao })
    const overdue = isOilChangeOverdue({ currentKm, vehicleId: v.id, oilChanges: oleo })
    const custoVeiculo =
      combustivel.filter((l) => l.vehicle_id === v.id).reduce((sum, l) => sum + l.liters * l.fuel_price, 0) +
      oleo.filter((l) => l.vehicle_id === v.id).reduce((sum, l) => sum + l.service_cost, 0) +
      manutencao.filter((l) => l.vehicle_id === v.id).reduce((sum, l) => sum + l.service_cost, 0)
    return [
      v.plate,
      VEHICLE_TYPE_LABELS[v.type],
      formatKm(currentKm),
      formatCurrency(custoVeiculo),
      overdue ? "Óleo vencido" : "Em dia",
    ]
  })

  const overdueCount = veiculos.filter((v) => {
    const currentKm = deriveCurrentKm({ vehicleId: v.id, fuelLogs: combustivel, oilChanges: oleo, maintenanceLogs: manutencao })
    return isOilChangeOverdue({ currentKm, vehicleId: v.id, oilChanges: oleo })
  }).length

  const doc = buildReport({
    title: "Relatório da Frota",
    summary: [
      { label: "Veículos", value: String(veiculos.length) },
      { label: "Litros totais", value: `${litersTotal.toFixed(0)} L` },
      { label: "Gasto total", value: formatCurrency(gastoTotal) },
      { label: "Consumo médio", value: `${consumoMedio.toFixed(1)} km/L` },
      { label: "Óleo vencido", value: String(overdueCount) },
    ],
    sections: [{ head: ["Placa", "Tipo", "KM atual", "Custo total", "Situação"], rows }],
  })

  downloadReport(doc, `frota-${new Date().toISOString().slice(0, 10)}`)
}