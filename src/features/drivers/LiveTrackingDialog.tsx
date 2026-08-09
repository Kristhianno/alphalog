import L from "leaflet"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useLocalizacaoMotorista } from "@/hooks/useLocalizacao"
import { useSolicitacao } from "@/hooks/useSolicitacoes"
import { coordinatesFromAddress } from "@/domain/regions"
import { STATUS_LABELS } from "@/domain/requestStatus"
import { STATUS_BADGE_VARIANT } from "@/lib/constants"
import { formatDateTime } from "@/lib/format"
import type { Motorista } from "@/types/entities"

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function dotIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 0 1px ${color}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

const originIcon = dotIcon("#16a34a")
const destinationIcon = dotIcon("#dc2626")

interface LiveTrackingDialogProps {
  motorista: Motorista | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LiveTrackingDialog({ motorista, open, onOpenChange }: LiveTrackingDialogProps) {
  const { data: location } = useLocalizacaoMotorista(open ? motorista?.id : undefined)
  const { data: request } = useSolicitacao(open ? location?.delivery_request_id : undefined)

  const originCoords = request ? coordinatesFromAddress(request.origin_address) : undefined
  const destinationCoords = request ? coordinatesFromAddress(request.destination_address) : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent preventOutsideClose className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rastreamento — {motorista?.name}</DialogTitle>
        </DialogHeader>

        {!location ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sem localização registrada para este motorista no momento.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-muted-foreground">
                Velocidade: <span className="font-medium text-foreground">{Math.round(location.speed ?? 0)} km/h</span>
              </span>
              {request && (
                <Badge variant={STATUS_BADGE_VARIANT[request.status]}>{STATUS_LABELS[request.status]}</Badge>
              )}
              <span className="text-xs text-muted-foreground">Atualizado em {formatDateTime(location.updated_at)}</span>
            </div>

            <div className="h-80 w-full overflow-hidden rounded-md border border-border">
              <MapContainer
                center={[location.latitude, location.longitude]}
                zoom={13}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[location.latitude, location.longitude]} icon={defaultIcon}>
                  <Popup>{motorista?.name}</Popup>
                </Marker>
                {originCoords && (
                  <Marker position={[originCoords.lat, originCoords.lng]} icon={originIcon}>
                    <Popup>Origem: {request?.origin_address}</Popup>
                  </Marker>
                )}
                {destinationCoords && (
                  <Marker position={[destinationCoords.lat, destinationCoords.lng]} icon={destinationIcon}>
                    <Popup>Destino: {request?.destination_address}</Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}