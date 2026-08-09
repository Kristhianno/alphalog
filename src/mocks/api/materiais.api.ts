import type { TipoDeMaterial } from "@/types/entities"
import { getDB } from "../db/store"
import { simulateLatency } from "./shared/latency"

export async function listTiposDeMaterial(): Promise<TipoDeMaterial[]> {
  await simulateLatency()
  return getDB().tiposMaterial
}
