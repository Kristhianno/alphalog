import { CheckCircle2 } from "lucide-react"
import logoStacked from "@/assets/logo-stacked.png"

const BENEFITS = [
  "Rastreabilidade completa de cada entrega, do pedido à assinatura",
  "Alocação ágil: motoristas compatíveis veem a corrida na hora",
  "Cliente acompanha o motorista em tempo real, sem precisar ligar",
  "Controle de frota: combustível, óleo e manutenção num só lugar",
]

export function BrandPanel() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.16),transparent_45%),radial-gradient(circle_at_80%_85%,rgba(255,255,255,0.12),transparent_40%)]"
      />
      <div className="relative flex flex-col items-start gap-8">
        <img src={logoStacked} alt="AlphaData" className="h-24 w-auto brightness-0 invert" />
        <div className="max-w-sm space-y-2">
          <h1 className="text-2xl font-semibold">Gestão logística de ponta a ponta</h1>
          <p className="text-sm text-primary-foreground/80">
            Central operacional, motoristas e clientes conectados em torno de cada
            solicitação de frete, do pedido à entrega.
          </p>
        </div>
      </div>

      <ul className="relative space-y-3">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2.5 text-sm text-primary-foreground/90">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      <p className="relative text-xs text-primary-foreground/60">
        Protótipo com dados fictícios — nenhuma informação real de cliente, motorista ou
        entrega é usada neste ambiente.
      </p>
    </div>
  )
}
