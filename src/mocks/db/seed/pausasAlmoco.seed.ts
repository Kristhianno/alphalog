import type { Attachment, PausaAlmoco } from "@/types/entities"
import { generateId } from "../ids"
import { dateOnlyAtOffset, isoAtOffset } from "./dateHelpers"
import { SEED_DRIVER_IDS } from "./motoristas.seed"

interface LunchSpec {
  driverId: string
  employeeName: string
  daysAgo: number
  exitTime: string
  returnTime?: string
  valor?: number
  hasReceipt?: boolean
  observacoes?: string
}

function receipt(): Attachment {
  return {
    id: generateId("anexo"),
    name: "comprovante-almoco.jpg",
    url: "/mock-attachments/comprovante-almoco.jpg",
    uploaded_at: new Date().toISOString(),
  }
}

const specs: LunchSpec[] = [
  { driverId: SEED_DRIVER_IDS.joao, employeeName: "João Pedro Nascimento", daysAgo: 1, exitTime: "12:00", returnTime: "13:00", valor: 28, hasReceipt: true },
  { driverId: SEED_DRIVER_IDS.joao, employeeName: "João Pedro Nascimento", daysAgo: 2, exitTime: "12:15", returnTime: "13:10", valor: 32, hasReceipt: true },
  { driverId: SEED_DRIVER_IDS.joao, employeeName: "João Pedro Nascimento", daysAgo: 3, exitTime: "11:50", returnTime: "12:45" },
  { driverId: SEED_DRIVER_IDS.joao, employeeName: "João Pedro Nascimento", daysAgo: 5, exitTime: "12:30", returnTime: "13:20", valor: 25, hasReceipt: true },
  { driverId: SEED_DRIVER_IDS.joao, employeeName: "João Pedro Nascimento", daysAgo: 8, exitTime: "12:00", returnTime: "13:05" },
  { driverId: SEED_DRIVER_IDS.marcia, employeeName: "Márcia Helena Duarte", daysAgo: 1, exitTime: "12:20", returnTime: "13:15", valor: 30, hasReceipt: true },
  { driverId: SEED_DRIVER_IDS.marcia, employeeName: "Márcia Helena Duarte", daysAgo: 3, exitTime: "12:00", returnTime: "12:55", valor: 27, hasReceipt: true },
  { driverId: SEED_DRIVER_IDS.marcia, employeeName: "Márcia Helena Duarte", daysAgo: 6, exitTime: "11:45", returnTime: "12:40" },
  { driverId: SEED_DRIVER_IDS.marcia, employeeName: "Márcia Helena Duarte", daysAgo: 9, exitTime: "12:10", returnTime: "13:00", valor: 29, hasReceipt: true },
  { driverId: SEED_DRIVER_IDS.marcia, employeeName: "Márcia Helena Duarte", daysAgo: 12, exitTime: "12:00", returnTime: "13:30", observacoes: "Parada mais longa devido a trânsito no retorno." },
]

export function seedPausasAlmoco(): PausaAlmoco[] {
  return specs.map((spec, index) => ({
    id: `almoco-${index + 1}`,
    driver_id: spec.driverId,
    employee_name: spec.employeeName,
    break_date: dateOnlyAtOffset(-spec.daysAgo),
    exit_time: spec.exitTime,
    return_time: spec.returnTime,
    observacoes: spec.observacoes,
    attachments: spec.hasReceipt ? [receipt()] : [],
    valor: spec.valor,
    created_at: isoAtOffset(-spec.daysAgo),
    updated_at: isoAtOffset(-spec.daysAgo),
  }))
}
