export function generateId(prefix = "id"): string {
  return `${prefix}_${crypto.randomUUID()}`
}

export function nowIso(): string {
  return new Date().toISOString()
}
