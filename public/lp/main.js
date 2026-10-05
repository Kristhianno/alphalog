// ===== Links do WhatsApp: troque só aqui =====

// Número comercial do Repdrive (só dígitos, com 55 + DDD).
const WHATSAPP_NUMBER = "554191497748"
const WHATSAPP_TEXT = "Olá! Quero falar com um especialista do Repdrive."
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`

// Convite do grupo de demonstração "Repdrive" (a demo começa pelo grupo e segue no privado).
// Enquanto estiver vazio, os botões "Testar grátis" abrem a conversa no WHATSAPP_URL.
const DEMO_URL = "https://chat.whatsapp.com/LVKw3kd8ohD2I0ub8MnlES"

// =============================================

const links = {
  demo: DEMO_URL || `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Quero testar o Repdrive")}`,
  contato: WHATSAPP_URL,
}

for (const a of document.querySelectorAll("[data-cta]")) {
  const msg = a.dataset.msg
  a.href = msg ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}` : links[a.dataset.cta]
  a.target = "_blank"
  a.rel = "noopener"
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

// Conversa do hero: mensagens aparecem uma a uma e o ciclo recomeça
const chat = document.getElementById("hero-chat")
if (chat && !reduceMotion) {
  const steps = [...chat.querySelectorAll("[data-step]")]
  const [question, typing, answer] = steps
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const loop = async () => {
    for (;;) {
      steps.forEach((s) => s.classList.remove("is-on"))
      await wait(700)
      question.classList.add("is-on")
      await wait(1100)
      typing.classList.add("is-on")
      await wait(1600)
      typing.classList.remove("is-on")
      answer.classList.add("is-on")
      await wait(7000)
    }
  }
  loop()
}

// Elementos aparecem ao rolar
const revealables = document.querySelectorAll(".reveal")
if (!reduceMotion && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible")
          io.unobserve(e.target)
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  )
  revealables.forEach((el) => io.observe(el))
} else {
  revealables.forEach((el) => el.classList.add("is-visible"))
}

// Abas acessíveis (clique, setas, Home/End)
const tabs = [...document.querySelectorAll('[role="tab"]')]
const select = (tab) => {
  for (const t of tabs) {
    const on = t === tab
    t.setAttribute("aria-selected", String(on))
    t.tabIndex = on ? 0 : -1
    document.getElementById(t.getAttribute("aria-controls")).hidden = !on
  }
}
tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => select(tab))
  tab.addEventListener("keydown", (e) => {
    const map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }
    if (!(e.key in map)) return
    e.preventDefault()
    const next = tabs[(map[e.key] + tabs.length) % tabs.length]
    select(next)
    next.focus()
  })
})
