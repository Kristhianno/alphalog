import * as React from "react"
import { Bot, Send, Sparkles } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useSolicitacoesList } from "@/hooks/useSolicitacoes"
import { useMotoristasList } from "@/hooks/useMotoristas"
import { useVeiculosList } from "@/hooks/useVeiculos"
import { useClientesList } from "@/hooks/useClientes"
import { useUsuariosList } from "@/hooks/useUsuarios"
import { usePrecosList } from "@/hooks/usePrecos"
import { useCombustivelList } from "@/hooks/useCombustivel"
import { useTrocasDeOleoList } from "@/hooks/useOleo"
import { useRegistrosManutencaoList } from "@/hooks/useManutencao"
import { useChecklistsList } from "@/hooks/useChecklists"
import { usePausasAlmocoList } from "@/hooks/usePausasAlmoco"
import { useLocalizacoesList } from "@/hooks/useLocalizacao"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"
import { answerFreeText, SUGGESTED_QUESTIONS, type AiAnswer, type AiContext } from "./aiEngine"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  text: string
  stats?: AiAnswer["stats"]
  items?: AiAnswer["items"]
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: 'Olá! Sou o copiloto de operação da AlphaLog — respondo com base nos dados atuais do sistema (solicitações, motoristas, frota, usuários, clientes e financeiro). Toque em uma sugestão abaixo ou digite sua pergunta livremente. Também entendo consultas diretas por número de solicitação ("status da #1025"), placa de veículo, ou nome de motorista/cliente.',
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function AiAssistantPage() {
  const { session } = useAuth()
  const { data: solicitacoes, isLoading: loadingSolicitacoes } = useSolicitacoesList()
  const { data: motoristas, isLoading: loadingMotoristas } = useMotoristasList()
  const { data: veiculos, isLoading: loadingVeiculos } = useVeiculosList()
  const { data: clientes, isLoading: loadingClientes } = useClientesList()
  const { data: usuarios, isLoading: loadingUsuarios } = useUsuariosList()
  const { data: precos } = usePrecosList()
  const { data: combustivel } = useCombustivelList()
  const { data: oleo } = useTrocasDeOleoList()
  const { data: manutencao } = useRegistrosManutencaoList()
  const { data: checklists } = useChecklistsList()
  const { data: pausasAlmoco } = usePausasAlmocoList()
  const { data: localizacoes } = useLocalizacoesList()

  const isLoading =
    loadingSolicitacoes || loadingMotoristas || loadingVeiculos || loadingClientes || loadingUsuarios

  const ctx: AiContext = React.useMemo(
    () => ({
      solicitacoes: solicitacoes ?? [],
      motoristas: motoristas ?? [],
      veiculos: veiculos ?? [],
      clientes: clientes ?? [],
      usuarios: usuarios ?? [],
      precos: precos ?? [],
      combustivel: combustivel ?? [],
      oleo: oleo ?? [],
      manutencao: manutencao ?? [],
      checklists: checklists ?? [],
      pausasAlmoco: pausasAlmoco ?? [],
      localizacoes: localizacoes ?? [],
    }),
    [
      solicitacoes,
      motoristas,
      veiculos,
      clientes,
      usuarios,
      precos,
      combustivel,
      oleo,
      manutencao,
      checklists,
      pausasAlmoco,
      localizacoes,
    ],
  )

  const [messages, setMessages] = React.useState<ChatMessage[]>([WELCOME_MESSAGE])
  const [input, setInput] = React.useState("")
  const [isThinking, setIsThinking] = React.useState(false)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, isThinking])

  async function ask(question: string) {
    const trimmed = question.trim()
    if (!trimmed || isThinking) return

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: trimmed }])
    setInput("")
    setIsThinking(true)
    await wait(450 + Math.random() * 500)
    const answer = answerFreeText(trimmed, ctx)
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "assistant", text: answer.text, stats: answer.stats, items: answer.items },
    ])
    setIsThinking(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void ask(input)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void ask(input)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <Card className="flex items-start gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium">Copiloto da operação (protótipo)</p>
          <p className="text-xs text-muted-foreground">
            Respostas geradas a partir dos dados atuais do sistema — uma prévia de como seria o dia a dia operando com um
            agente de IA integrado ao fluxo operacional.
          </p>
        </div>
      </Card>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ScrollArea className="min-h-0 flex-1 px-4 py-4">
          <div className="flex min-w-0 flex-col gap-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} userName={session?.user.name ?? "Você"} />
            ))}
            {isThinking && <ThinkingBubble />}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="border-t border-border p-3">
          {isLoading ? (
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-36 shrink-0 rounded-full" />
              ))}
            </div>
          ) : (
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
              {SUGGESTED_QUESTIONS.map((q) => (
                <Button
                  key={q.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-full"
                  disabled={isThinking}
                  onClick={() => void ask(q.question)}
                >
                  {q.question}
                </Button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre a operação..."
              className="min-h-10 flex-1 resize-none py-2.5"
              rows={1}
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || isThinking || !input.trim()} aria-label="Enviar pergunta">
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}

function MessageBubble({ message, userName }: { message: ChatMessage; userName: string }) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex items-start gap-2.5", isUser && "flex-row-reverse")}>
      <Avatar className="size-7 shrink-0">
        {isUser ? (
          <AvatarFallback className="bg-primary/15 text-primary">{initials(userName)}</AvatarFallback>
        ) : (
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="size-3.5" />
          </AvatarFallback>
        )}
      </Avatar>

      <div className={cn("flex max-w-[85%] min-w-0 flex-col gap-2 sm:max-w-[75%]", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words",
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm border border-border bg-muted/50 text-foreground",
          )}
        >
          {message.text}
        </div>

        {message.stats && message.stats.length > 0 && (
          <div className="flex w-full flex-wrap gap-2">
            {message.stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-card px-3 py-1.5">
                <p className="text-[10px] font-medium text-muted-foreground">{s.label}</p>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    s.tone === "success" && "text-success",
                    s.tone === "warning" && "text-warning-foreground",
                    s.tone === "destructive" && "text-destructive",
                  )}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {message.items && message.items.length > 0 && (
          <div className="w-full divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {message.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{item.title}</p>
                  {item.subtitle && <p className="truncate text-[11px] text-muted-foreground">{item.subtitle}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.meta && <span className="text-xs font-medium text-muted-foreground">{item.meta}</span>}
                  {item.badge && <Badge variant={item.badge.variant}>{item.badge.label}</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ThinkingBubble() {
  return (
    <div className="flex items-start gap-2.5">
      <Avatar className="size-7 shrink-0">
        <AvatarFallback className="bg-primary text-primary-foreground">
          <Bot className="size-3.5" />
        </AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-border bg-muted/50 px-3.5 py-3">
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
      </div>
    </div>
  )
}
