const APP_TIMEZONE = "America/Sao_Paulo"

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const relativeDayFormatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" })

export function formatCurrency(value: number | undefined | null): string {
  if (value == null) return "A combinar"
  return currencyFormatter.format(value)
}

export function formatDate(value: string | undefined | null): string {
  if (!value) return "—"
  return dateFormatter.format(new Date(value))
}

export function formatDateTime(value: string | undefined | null): string {
  if (!value) return "—"
  return dateTimeFormatter.format(new Date(value))
}

export function formatRelativeDay(value: string): string {
  const target = new Date(value)
  const today = new Date()
  const diffDays = Math.round(
    (Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) -
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      (1000 * 60 * 60 * 24),
  )
  if (Math.abs(diffDays) <= 6) return relativeDayFormatter.format(diffDays, "day")
  return formatDate(value)
}

export function formatKm(value: number): string {
  return `${new Intl.NumberFormat("pt-BR").format(Math.round(value))} km`
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}
