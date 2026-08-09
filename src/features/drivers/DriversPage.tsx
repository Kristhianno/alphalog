import { useAuth } from "@/context/AuthContext"
import { DriverQueueView } from "./DriverQueueView"
import { AdminDriversView } from "./AdminDriversView"

export function DriversPage() {
  const { actor } = useAuth()
  if (actor?.role === "motorista") return <DriverQueueView />
  return <AdminDriversView />
}