/**
 * Simula latência de rede para que o formato de chamada (Promise + delay) permaneça
 * idêntico ao de um backend real — trocar esta camada por chamadas HTTP de verdade no
 * futuro não deve exigir mudar nada em `hooks/**` ou nas telas.
 */
export function simulateLatency(): Promise<void> {
  if (import.meta.env.MODE === "test") return Promise.resolve()
  const delay = 150 + Math.random() * 350
  return new Promise((resolve) => setTimeout(resolve, delay))
}
