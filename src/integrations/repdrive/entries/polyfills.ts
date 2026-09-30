/**
 * O Code node do n8n roda num sandbox que pode não expor `crypto` — o seed usa
 * crypto.randomUUID() nos anexos simulados. Os ids gerados aqui só precisam ser únicos.
 */
const g = globalThis as { crypto?: { randomUUID?: () => string } }
if (typeof g.crypto?.randomUUID !== "function") {
  let counter = 0
  const randomUUID = () => {
    counter += 1
    const hex = (Date.now().toString(16) + counter.toString(16).padStart(8, "0") + Math.random().toString(16).slice(2)).padEnd(32, "0")
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
  }
  try {
    g.crypto = { ...(g.crypto ?? {}), randomUUID }
  } catch {
    Object.defineProperty(globalThis, "crypto", { value: { randomUUID }, configurable: true })
  }
}

export {}
