import logoHorizontal from "@/assets/logo-horizontal.png"

export function BrandPanel() {
  return (
    <div className="hidden items-center justify-center bg-sidebar lg:flex">
      <img src={logoHorizontal} alt="AlphaLog" className="h-20 w-auto" />
    </div>
  )
}