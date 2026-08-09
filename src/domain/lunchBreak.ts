/**
 * Duração do almoço é sempre calculada na exibição, nunca armazenada (regra 9).
 * `exitTime`/`returnTime` no formato "HH:mm". Retorna undefined se ainda não houve retorno.
 */
export function computeLunchDurationMinutes(
  exitTime: string,
  returnTime?: string,
): number | undefined {
  if (!returnTime) return undefined

  const [exitHours, exitMinutes] = exitTime.split(":").map(Number)
  const [returnHours, returnMinutes] = returnTime.split(":").map(Number)

  const exitTotal = exitHours * 60 + exitMinutes
  const returnTotal = returnHours * 60 + returnMinutes

  const duration = returnTotal - exitTotal
  return duration >= 0 ? duration : undefined
}

export function formatDurationMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (hours === 0) return `${remaining}min`
  return `${hours}h${remaining > 0 ? ` ${remaining}min` : ""}`
}
