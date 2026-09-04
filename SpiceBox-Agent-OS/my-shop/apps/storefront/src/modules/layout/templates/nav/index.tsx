import { Suspense } from "react"

import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"

// Clean Shadcn / Lucide SVG Icons
const Icons = {
  User: () => (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Compass: () => (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
    </svg>
  ),
  ShoppingBag: () => (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
      <path d="M3 6h18"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  )
}

export default async function Nav() {
  const [regions, locales, currentLocale] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
  ])

  return (
    <div className="sticky top-0 inset-x-0 z-50">
      <header className="relative h-16 mx-auto bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-xs transition-all">
        <nav className="content-container flex items-center justify-between w-full h-full text-xs font-semibold text-neutral-700">
          
          {/* Left: Side Menu & Direct Navigation */}
          <div className="flex-1 basis-0 h-full flex items-center gap-3">
            <div className="h-full flex items-center">
              <SideMenu regions={regions} locales={locales} currentLocale={currentLocale} />
            </div>
            
            <div className="hidden md:flex items-center gap-2 border-l border-neutral-200 pl-3">
              <LocalizedClientLink
                href="/store"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 transition-colors uppercase tracking-wider text-[11px] font-bold"
              >
                <Icons.Compass />
                <span>All Products</span>
              </LocalizedClientLink>
            </div>
          </div>

          {/* Center: Brand Logo */}
          <div className="flex items-center justify-center h-full">
            <LocalizedClientLink
              href="/"
              className="text-base font-black tracking-tighter text-neutral-950 uppercase flex items-center gap-2.5 group/logo hover:opacity-90 transition-opacity"
              data-testid="nav-store-link"
            >
              <div className="w-8 h-8 rounded-xl bg-neutral-950 text-white flex items-center justify-center font-black text-sm shadow-md ring-2 ring-neutral-900/10 group-hover/logo:scale-105 transition-transform">
                S
              </div>
              <div className="flex flex-col">
                <span className="tracking-tight font-extrabold text-sm sm:text-base text-neutral-950 leading-none">
                  SPICEBOX STORE
                </span>
                <span className="text-[9px] tracking-widest text-neutral-400 font-semibold uppercase mt-0.5">
                  Commerce OS
                </span>
              </div>
            </LocalizedClientLink>
          </div>

          {/* Right: Account & Cart */}
          <div className="flex items-center gap-x-2 sm:gap-x-3 h-full flex-1 basis-0 justify-end">
            <div className="hidden small:flex items-center h-full">
              <LocalizedClientLink
                className="text-xs font-bold text-neutral-700 hover:text-neutral-950 transition-colors px-3 py-1.5 rounded-lg hover:bg-neutral-100 flex items-center gap-2"
                href="/account"
                data-testid="nav-account-link"
              >
                <Icons.User />
                <span>Account</span>
              </LocalizedClientLink>
            </div>
            
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition-all"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  <Icons.ShoppingBag />
                  <span>Cart</span>
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-white text-neutral-950 text-[10px] font-bold flex items-center justify-center">
                    0
                  </span>
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </nav>
      </header>
    </div>
  )
}
