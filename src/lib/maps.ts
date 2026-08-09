/** Monta a URL de um app de mapas externo para abrir a rota a partir de um endereço de texto. */
export function externalMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}