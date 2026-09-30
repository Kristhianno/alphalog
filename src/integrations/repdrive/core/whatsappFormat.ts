import type { AiAnswer } from "@/features/ai-assistant/aiEngine"

/** Converte a resposta estruturada do assistente em texto de WhatsApp (*negrito*, listas com •). */
export function answerToWhatsApp(answer: AiAnswer): string {
  const lines = [answer.text]

  if (answer.stats?.length) {
    lines.push("", ...answer.stats.map((s) => `• ${s.label}: *${s.value}*`))
  }

  if (answer.items?.length) {
    lines.push(
      "",
      ...answer.items.map((item) => {
        const detail = [item.subtitle, item.meta].filter(Boolean).join(" · ")
        return `• *${item.title}*${detail ? ` — ${detail}` : ""}`
      }),
    )
  }

  return lines.join("\n")
}

export function bulletList(items: string[]): string {
  return items.map((i) => `• ${i}`).join("\n")
}
