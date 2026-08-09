import type { Motorista } from "@/types/entities"
import { isoAtOffset } from "./dateHelpers"
import { SEED_USER_IDS } from "./usuarios.seed"
import { SEED_VEHICLE_IDS } from "./veiculos.seed"

export const SEED_DRIVER_IDS = {
  joao: "motorista-joao",
  marcia: "motorista-marcia",
} as const

export function seedMotoristas(): Motorista[] {
  const createdAt = isoAtOffset(-160)

  return [
    {
      id: SEED_DRIVER_IDS.joao,
      user_id: SEED_USER_IDS.motoristaJoao,
      name: "João Pedro Nascimento",
      phone: "(11) 98544-7733",
      email: "joao.motorista@alphadata.internal",
      license_number: "MG-4488213",
      cnh_category: "B",
      cnh_valid_until: "2028-04-12",
      is_fixed: true,
      vehicle_id: SEED_VEHICLE_IDS.utilitario1,
      enabled_vehicle_types: ["utilitario"],
      status: "ativo",
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: SEED_DRIVER_IDS.marcia,
      user_id: SEED_USER_IDS.motoristaMarcia,
      name: "Márcia Helena Duarte",
      phone: "(11) 98655-8844",
      email: "marcia.motorista@alphadata.internal",
      license_number: "SP-7739215",
      cnh_category: "C",
      cnh_valid_until: "2027-09-30",
      is_fixed: false,
      vehicle_id: SEED_VEHICLE_IDS.caminhaoMedio1,
      enabled_vehicle_types: ["utilitario", "caminhao_medio"],
      status: "ativo",
      created_at: createdAt,
      updated_at: createdAt,
    },
  ]
}
