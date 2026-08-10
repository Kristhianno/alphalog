import logoHorizontal from "@/assets/logo-horizontal.png"

export function BrandPanel() {
  return (
    <div className="hidden items-center justify-center border-r-4 border-primary bg-sidebar lg:flex">
      <img src={logoHorizontal} alt="AlphaLog" className="h-14 w-auto" />
    </div>
  )
}