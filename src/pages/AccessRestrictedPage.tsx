import { Link } from "react-router-dom"
import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AccessRestrictedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <ShieldAlert className="size-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Acesso restrito</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Seu papel atual não tem permissão para acessar esta área do sistema.
      </p>
      <Button asChild variant="outline">
        <Link to="/">Voltar para o Painel</Link>
      </Button>
    </div>
  )
}
