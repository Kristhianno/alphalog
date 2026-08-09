import * as React from "react"
import { FileText, MapPin, Users as UsersIcon } from "lucide-react"
import { useMotoristasList } from "@/hooks/useMotoristas"
import { useSolicitacoesList } from "@/hooks/useSolicitacoes"
import { useVeiculosList } from "@/hooks/useVeiculos"
import { usePausasAlmocoList } from "@/hooks/usePausasAlmoco"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LiveTrackingDialog } from "./LiveTrackingDialog"
import { DriverDocumentsDialog } from "./DriverDocumentsDialog"
import { LunchBreakHistoryTable } from "./LunchBreakHistoryTable"
import { isDriverOnline } from "@/domain/driverAvailability"
import { VEHICLE_TYPE_LABELS } from "@/lib/constants"
import { ACTIVE_REQUEST_STATUSES } from "@/types/enums"
import type { Motorista } from "@/types/entities"

export function AdminDriversView() {
  const { data: motoristas, isLoading } = useMotoristasList()
  const { data: solicitacoes } = useSolicitacoesList()
  const { data: veiculos } = useVeiculosList()
  const { data: pausas } = usePausasAlmocoList()

  const [trackingDriver, setTrackingDriver] = React.useState<Motorista | undefined>(undefined)
  const [docsDriver, setDocsDriver] = React.useState<Motorista | undefined>(undefined)

  const requests = solicitacoes ?? []
  const totalMotoristas = motoristas?.length ?? 0
  const entreguesTotal = requests.filter((r) => r.status === "entregue" && r.driver_id).length
  const corridasAtivas = requests.filter((r) => r.driver_id && ACTIVE_REQUEST_STATUSES.includes(r.status)).length

  const driverNameById = React.useMemo(
    () => new Map((motoristas ?? []).map((m) => [m.id, m.name])),
    [motoristas],
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total de motoristas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalMotoristas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Entregas concluídas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{entreguesTotal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Corridas ativas agora</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{corridasAtivas}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !motoristas || motoristas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <UsersIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum motorista cadastrado.</p>
        </div>
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Tipos habilitados</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Concluídas</TableHead>
                  <TableHead>Ativas</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-52" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {motoristas.map((driver) => {
                  const own = requests.filter((r) => r.driver_id === driver.id)
                  const concluidas = own.filter((r) => r.status === "entregue").length
                  const ativas = own.filter((r) => ACTIVE_REQUEST_STATUSES.includes(r.status)).length
                  const online = isDriverOnline(driver.id, requests)
                  return (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">{driver.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {driver.enabled_vehicle_types.map((t) => VEHICLE_TYPE_LABELS[t]).join(", ") || "—"}
                      </TableCell>
                      <TableCell>{own.length}</TableCell>
                      <TableCell>{concluidas}</TableCell>
                      <TableCell>{ativas}</TableCell>
                      <TableCell>
                        <Badge variant={online ? "success" : "muted"}>{online ? "Online" : "Offline"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!online}
                            onClick={() => setTrackingDriver(driver)}
                          >
                            <MapPin />
                            Rastrear
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setDocsDriver(driver)}>
                            <FileText />
                            Documentos
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>

          <div className="space-y-3 md:hidden">
            {motoristas.map((driver) => {
              const own = requests.filter((r) => r.driver_id === driver.id)
              const concluidas = own.filter((r) => r.status === "entregue").length
              const ativas = own.filter((r) => ACTIVE_REQUEST_STATUSES.includes(r.status)).length
              const online = isDriverOnline(driver.id, requests)
              return (
                <Card key={driver.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{driver.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {driver.enabled_vehicle_types.map((t) => VEHICLE_TYPE_LABELS[t]).join(", ") || "—"}
                      </p>
                    </div>
                    <Badge variant={online ? "success" : "muted"}>{online ? "Online" : "Offline"}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-medium">{own.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Concluídas</p>
                      <p className="font-medium">{concluidas}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ativas</p>
                      <p className="font-medium">{ativas}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={!online}
                      onClick={() => setTrackingDriver(driver)}
                    >
                      <MapPin />
                      Rastrear
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setDocsDriver(driver)}>
                      <FileText />
                      Documentos
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <Separator />

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Histórico de almoço da frota</h2>
        <LunchBreakHistoryTable records={pausas ?? []} driverNameById={driverNameById} />
      </div>

      <LiveTrackingDialog
        motorista={trackingDriver}
        open={!!trackingDriver}
        onOpenChange={(open) => !open && setTrackingDriver(undefined)}
      />
      <DriverDocumentsDialog
        motorista={docsDriver}
        veiculo={veiculos?.find((v) => v.id === docsDriver?.vehicle_id)}
        open={!!docsDriver}
        onOpenChange={(open) => !open && setDocsDriver(undefined)}
      />
    </div>
  )
}