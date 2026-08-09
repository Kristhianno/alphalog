import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const schema = z.object({
  identifier: z.string().min(1, "Informe o usuário ou e-mail."),
  password: z.string().min(1, "Informe a senha."),
})

type FormValues = z.infer<typeof schema>

const DEMO_ACCOUNTS = [
  { label: "Admin", identifier: "admin", password: "admin123" },
  { label: "Gestor", identifier: "gestor", password: "gestor123" },
  { label: "Assistente Logístico", identifier: "assistente", password: "assistente123" },
  { label: "Motorista (fixo)", identifier: "joao.motorista", password: "motorista123" },
  { label: "Motorista (agregado)", identifier: "marcia.motorista", password: "motorista123" },
  { label: "Cliente", identifier: "roberto.mendes@transportesloja.com.br", password: "cliente123" },
]

export function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
  })

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      await login(values.identifier, values.password)
      navigate("/", { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function fillDemoAccount(identifier: string, password: string) {
    form.setValue("identifier", identifier)
    form.setValue("password", password)
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="identifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Usuário ou e-mail</FormLabel>
                <FormControl>
                  <Input placeholder="admin" autoComplete="username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </Form>

      <div className="rounded-lg border border-dashed border-border bg-muted/50 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Contas de demonstração (dados fictícios) — clique para preencher:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.identifier}
              type="button"
              onClick={() => fillDemoAccount(account.identifier, account.password)}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {account.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
