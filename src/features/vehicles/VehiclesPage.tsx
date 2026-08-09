import { useAuth } from "@/context/AuthContext"
import { DriverVehicleView } from "./DriverVehicleView"
import { AdminFleetView } from "./AdminFleetView"

export function VehiclesPage() {
  const { actor } = useAuth()
  if (actor?.role === "motorista") return <DriverVehicleView />
  return <AdminFleetView />
}