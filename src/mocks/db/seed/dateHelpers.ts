function pad(n: number): string {
  return String(n).padStart(2, "0")
}

export function atOffset(daysOffset: number, hour = 9, minute = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  d.setHours(hour, minute, 0, 0)
  return d
}

export function isoAtOffset(daysOffset: number, hour = 9, minute = 0): string {
  return atOffset(daysOffset, hour, minute).toISOString()
}

export function dateOnlyAtOffset(daysOffset: number): string {
  const d = atOffset(daysOffset)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
