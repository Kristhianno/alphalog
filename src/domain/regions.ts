import type { RegiaoCidade } from "@/types/entities"

/**
 * Regiões de precificação fictícias (doc/08 pede que cada empresa redefina esta lista
 * conforme sua área de operação — aqui usamos 3 regiões fictícias para o protótipo).
 * Ordem = prioridade quando origem e destino caem em regiões diferentes: a região que
 * aparece depois na lista "vence" (regra 5 — a região mais cara costuma ser a mais distante
 * do centro de operação).
 */
export const REGIONS: RegiaoCidade[] = [
  {
    region: "Região Central",
    cities: ["Vale Novo", "Serra Dourada", "Campo Alegre"],
  },
  {
    region: "Região Norte",
    cities: ["Porto Claro", "Boa Vista do Rio", "Nova Esperança"],
  },
  {
    region: "Região Sul",
    cities: ["Rio Bonito", "Vila das Flores", "Monte Verde"],
  },
]

/** Coordenadas fictícias por cidade, usadas só para a estimativa de distância (haversine). */
export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "Vale Novo": { lat: -23.55, lng: -46.63 },
  "Serra Dourada": { lat: -23.6, lng: -46.7 },
  "Campo Alegre": { lat: -23.48, lng: -46.55 },
  "Porto Claro": { lat: -23.3, lng: -46.4 },
  "Boa Vista do Rio": { lat: -23.2, lng: -46.3 },
  "Nova Esperança": { lat: -23.15, lng: -46.5 },
  "Rio Bonito": { lat: -23.8, lng: -46.6 },
  "Vila das Flores": { lat: -23.9, lng: -46.75 },
  "Monte Verde": { lat: -24.0, lng: -46.9 },
}

export const ALL_CITIES = REGIONS.flatMap((r) => r.cities)

/**
 * Resolve a região a partir de um texto de endereço, buscando o nome de uma cidade
 * conhecida dentro do texto. Retorna undefined se nenhuma cidade puder ser identificada
 * (dispara o caso "a combinar" na regra 5).
 */
export function resolveRegionFromAddress(address: string): string | undefined {
  const normalized = address.toLowerCase()
  for (const { region, cities } of REGIONS) {
    if (cities.some((city) => normalized.includes(city.toLowerCase()))) {
      return region
    }
  }
  return undefined
}

/**
 * Entre a região de origem e a de destino, escolhe a "mais cara" — por convenção deste
 * blueprint, a que aparece depois na lista REGIONS (regra 5). Se qualquer uma das duas
 * pontas não resolver, a região final é indeterminada.
 */
export function resolvePricingRegion(
  originAddress: string,
  destinationAddress: string,
): string | undefined {
  const originRegion = resolveRegionFromAddress(originAddress)
  const destinationRegion = resolveRegionFromAddress(destinationAddress)

  if (!originRegion || !destinationRegion) return undefined
  if (originRegion === destinationRegion) return originRegion

  const originIndex = REGIONS.findIndex((r) => r.region === originRegion)
  const destinationIndex = REGIONS.findIndex((r) => r.region === destinationRegion)
  return originIndex > destinationIndex ? originRegion : destinationRegion
}

function cityFromAddress(address: string): string | undefined {
  const normalized = address.toLowerCase()
  return ALL_CITIES.find((city) => normalized.includes(city.toLowerCase()))
}

export function coordinatesFromAddress(
  address: string,
): { lat: number; lng: number } | undefined {
  const city = cityFromAddress(address)
  return city ? CITY_COORDINATES[city] : undefined
}
