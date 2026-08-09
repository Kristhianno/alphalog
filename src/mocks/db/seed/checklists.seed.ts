import type { ChecklistItemResposta, ChecklistVeiculo } from "@/types/entities"
import type { ChecklistAnswer } from "@/types/enums"
import { MATERIALS_CHECKLIST_ITEMS, VEHICLE_CHECKLIST_ITEMS } from "@/domain/checklist"
import { dateOnlyAtOffset, isoAtOffset } from "./dateHelpers"
import { SEED_VEHICLE_IDS } from "./veiculos.seed"
import { SEED_DRIVER_IDS } from "./motoristas.seed"

function group(
  items: readonly string[],
  answers: ChecklistAnswer[],
  notes?: Record<number, string>,
): ChecklistItemResposta[] {
  return items.map((label, index) => ({
    id: `item-${index}`,
    label,
    status: answers[index] ?? "sim",
    note: notes?.[index],
  }))
}

const allSim = (count: number): ChecklistAnswer[] => Array.from({ length: count }, () => "sim")

interface ChecklistSpec {
  vehicleId: string
  plate: string
  driverId: string
  daysAgo: number
  currentKm: number
  materiais: ChecklistItemResposta[]
  veiculo: ChecklistItemResposta[]
  veiculoObservacoes?: string
}

const specs: ChecklistSpec[] = [
  {
    vehicleId: SEED_VEHICLE_IDS.utilitario1,
    plate: "SPA3C45",
    driverId: SEED_DRIVER_IDS.joao,
    daysAgo: 3,
    currentKm: 35200,
    materiais: group(MATERIALS_CHECKLIST_ITEMS, allSim(6)),
    veiculo: group(VEHICLE_CHECKLIST_ITEMS, allSim(6)),
  },
  {
    vehicleId: SEED_VEHICLE_IDS.utilitario1,
    plate: "SPA3C45",
    driverId: SEED_DRIVER_IDS.joao,
    daysAgo: 10,
    currentKm: 33900,
    materiais: group(MATERIALS_CHECKLIST_ITEMS, allSim(6)),
    veiculo: group(VEHICLE_CHECKLIST_ITEMS, allSim(6)),
  },
  {
    vehicleId: SEED_VEHICLE_IDS.caminhaoMedio1,
    plate: "SPC5E67",
    driverId: SEED_DRIVER_IDS.marcia,
    daysAgo: 5,
    currentKm: 83100,
    materiais: group(MATERIALS_CHECKLIST_ITEMS, allSim(6)),
    veiculo: group(VEHICLE_CHECKLIST_ITEMS, allSim(6)),
  },
  {
    vehicleId: SEED_VEHICLE_IDS.caminhaoGrande1,
    plate: "SPE7G89",
    driverId: SEED_DRIVER_IDS.marcia,
    daysAgo: 6,
    currentKm: 153900,
    materiais: group(MATERIALS_CHECKLIST_ITEMS, allSim(6)),
    veiculo: group(VEHICLE_CHECKLIST_ITEMS, allSim(6)),
  },
  {
    // checklist sinalizado (2+ "não" somados) — motivo plausível do veículo estar em manutenção
    vehicleId: SEED_VEHICLE_IDS.moto2,
    plate: "RIO2B34",
    driverId: SEED_DRIVER_IDS.joao,
    daysAgo: 2,
    currentKm: 5100,
    materiais: group(MATERIALS_CHECKLIST_ITEMS, allSim(6)),
    veiculo: group(
      VEHICLE_CHECKLIST_ITEMS,
      ["nao", "nao", "sim", "sim", "nao", "sim"],
      { 0: "Pneu traseiro com desgaste acentuado", 1: "Freio traseiro amolecido", 4: "Vazamento leve de óleo identificado" },
    ),
    veiculoObservacoes: "Veículo encaminhado para manutenção corretiva no mesmo dia.",
  },
  {
    vehicleId: SEED_VEHICLE_IDS.moto1,
    plate: "RIO1A23",
    driverId: SEED_DRIVER_IDS.joao,
    daysAgo: 15,
    currentKm: 8120,
    materiais: group(MATERIALS_CHECKLIST_ITEMS, ["sim", "sim", "sim", "nao", "sim", "sim"], {
      3: "Documento do veículo estava em outro compartimento — regularizado.",
    }),
    veiculo: group(VEHICLE_CHECKLIST_ITEMS, allSim(6)),
  },
  {
    vehicleId: SEED_VEHICLE_IDS.utilitario2,
    plate: "SPB4D56",
    driverId: SEED_DRIVER_IDS.joao,
    daysAgo: 12,
    currentKm: 19400,
    materiais: group(MATERIALS_CHECKLIST_ITEMS, allSim(6)),
    veiculo: group(VEHICLE_CHECKLIST_ITEMS, allSim(6)),
  },
  {
    vehicleId: SEED_VEHICLE_IDS.caminhaoMedio1,
    plate: "SPC5E67",
    driverId: SEED_DRIVER_IDS.marcia,
    daysAgo: 15,
    currentKm: 82000,
    materiais: group(MATERIALS_CHECKLIST_ITEMS, allSim(6)),
    veiculo: group(VEHICLE_CHECKLIST_ITEMS, allSim(6)),
  },
  {
    vehicleId: SEED_VEHICLE_IDS.caminhaoGrande2,
    plate: "SPF8H90",
    driverId: SEED_DRIVER_IDS.marcia,
    daysAgo: 15,
    currentKm: 62400,
    materiais: group(MATERIALS_CHECKLIST_ITEMS, allSim(6)),
    veiculo: group(VEHICLE_CHECKLIST_ITEMS, ["sim", "sim", "sim", "sim", "sim", "nao"], {
      5: "Palheta do limpador dianteiro gasta — trocar na próxima revisão.",
    }),
  },
  {
    vehicleId: SEED_VEHICLE_IDS.utilitario1,
    plate: "SPA3C45",
    driverId: SEED_DRIVER_IDS.joao,
    daysAgo: 25,
    currentKm: 32800,
    materiais: group(MATERIALS_CHECKLIST_ITEMS, allSim(6)),
    veiculo: group(VEHICLE_CHECKLIST_ITEMS, allSim(6)),
  },
]

export function seedChecklists(): ChecklistVeiculo[] {
  return specs.map((spec, index) => ({
    id: `checklist-${index + 1}`,
    vehicle_id: spec.vehicleId,
    driver_id: spec.driverId,
    vehicle_plate: spec.plate,
    checklist_date: dateOnlyAtOffset(-spec.daysAgo),
    current_km: spec.currentKm,
    materiais: spec.materiais,
    materiais_attachments: [],
    veiculo: spec.veiculo,
    veiculo_observacoes: spec.veiculoObservacoes,
    veiculo_attachments: [],
    created_at: isoAtOffset(-spec.daysAgo),
    updated_at: isoAtOffset(-spec.daysAgo),
  }))
}
