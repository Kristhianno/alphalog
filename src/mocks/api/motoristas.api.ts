import type { Attachment, Motorista } from "@/types/entities"
import { getDB, saveDB } from "../db/store"
import { nowIso } from "../db/ids"
import { simulateLatency } from "./shared/latency"
import { ApiError } from "./shared/errors"
import { isStaff, type Actor } from "./shared/actor"

export async function listMotoristas(): Promise<Motorista[]> {
  await simulateLatency()
  return getDB().motoristas
}

export async function updateMotoristaDocumentos(
  id: string,
  patch: {
    licenseNumber?: string
    cnhCategory?: string
    cnhValidUntil?: string
    cnhAttachment?: Attachment
    vehicleId?: string
    documentAttachment?: Attachment
  },
  actor: Actor,
): Promise<Motorista> {
  await simulateLatency()
  if (!isStaff(actor)) {
    throw new ApiError("FORBIDDEN", "Apenas a administração edita a documentação do motorista.")
  }

  const db = getDB()
  const motorista = db.motoristas.find((m) => m.id === id)
  if (!motorista) throw new ApiError("NOT_FOUND", "Motorista não encontrado.")

  if (patch.licenseNumber) motorista.license_number = patch.licenseNumber
  if (patch.cnhCategory) motorista.cnh_category = patch.cnhCategory
  if (patch.cnhValidUntil) motorista.cnh_valid_until = patch.cnhValidUntil
  if (patch.cnhAttachment) motorista.cnh_attachment = patch.cnhAttachment
  if (patch.vehicleId) motorista.vehicle_id = patch.vehicleId
  motorista.updated_at = nowIso()

  saveDB()
  return motorista
}
