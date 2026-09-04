"use client"

import { Popover, PopoverPanel, Transition } from "@headlessui/react"
import useToggleState from "@lib/hooks/use-toggle-state"
import { ArrowRightMini, XMark } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text, clx } from "@modules/common/components/ui"
import { Fragment } from "react"
import CountrySelect from "../country-select"
import LanguageSelect from "../language-select"
import { Locale } from "@lib/data/locales"

// Shadcn / Lucide-style crisp SVG icons
const Icons = {
  Home: () => (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Store: () => (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
      <path d="M3 6h18"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
  Account: () => (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Cart: () => (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="21" r="1"/>
      <circle cx="19" cy="21" r="1"/>
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
    </svg>
  ),
  Menu: () => (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="12" y2="12"/>
      <line x1="4" x2="20" y1="6" y2="6"/>
      <line x1="4" x2="20" y1="18" y2="18"/>
    </svg>
  ),
  Layers: () => (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
}

const SideMenuItems = [
  { name: "Home", href: "/", icon: Icons.Home },
  { name: "All Products", href: "/store", icon: Icons.Store },
  { name: "My Account", href: "/account", icon: Icons.Account },
  { name: "Shopping Cart", href: "/cart", icon: Icons.Cart },
]

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  locales: Locale[] | null
  currentLocale: string | null
}

const SideMenu = ({ regions, locales, currentLocale }: SideMenuProps) => {
  const countryToggleState = useToggleState()
  const languageToggleState = useToggleState()

  return (
    <div className="h-full">
      <div className="flex items-center h-full">
        <Popover className="h-full flex">
          {({ open, close }) => (
            <>
              <div className="relative flex h-full">
                <Popover.Button
                  data-testid="nav-menu-button"
                  suppressHydrationWarning
                  className="relative h-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-neutral-800 hover:text-neutral-950 hover:bg-neutral-100 transition-all focus:outline-none"
                >
                  <Icons.Menu />
                  <span>Menu</span>
                </Popover.Button>
              </div>

              {open && (
                <div
                  className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm pointer-events-auto transition-opacity"
                  onClick={close}
                  data-testid="side-menu-backdrop"
                />
              )}

              <Transition
                show={open}
                as={Fragment}
                enter="transition ease-out duration-250"
                enterFrom="-translate-x-full opacity-0"
                enterTo="translate-x-0 opacity-100"
                leave="transition ease-in duration-200"
                leaveFrom="translate-x-0 opacity-100"
                leaveTo="-translate-x-full opacity-0"
              >
                <PopoverPanel
                  static
                  className="fixed inset-y-0 left-0 w-80 sm:w-96 h-screen z-[1000] bg-neutral-950 text-white shadow-2xl flex flex-col justify-between p-6 sm:p-8 border-r border-neutral-800"
                >
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between pb-6 border-b border-neutral-800">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-white text-neutral-950 flex items-center justify-center font-black text-xs shadow-xs">
                        S
                      </span>
                      <span className="text-xs font-black tracking-widest uppercase text-white">
                        SpiceBox Store
                      </span>
                    </div>
                    <button
                      data-testid="close-menu-button"
                      onClick={close}
                      suppressHydrationWarning
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                      title="Close Navigation"
                    >
                      <XMark className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Main Navigation with Shadcn Icons */}
                  <div className="flex flex-col gap-6 py-6 my-auto">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                      Explore Store
                    </span>
                    <ul className="flex flex-col gap-2">
                      {SideMenuItems.map((item) => {
                        const IconComponent = item.icon
                        return (
                          <li key={item.name}>
                            <LocalizedClientLink
                              href={item.href}
                              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-base font-semibold tracking-tight text-neutral-300 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-all group"
                              onClick={close}
                              data-testid={`${item.name.toLowerCase()}-link`}
                            >
                              <div className="p-1.5 rounded-lg bg-neutral-900 group-hover:bg-neutral-800 text-neutral-400 group-hover:text-white transition-colors">
                                <IconComponent />
                              </div>
                              <span>{item.name}</span>
                            </LocalizedClientLink>
                          </li>
                        )
                      })}
                    </ul>
                  </div>

                  {/* Footer Settings */}
                  <div className="flex flex-col gap-y-4 pt-6 border-t border-neutral-800">
                    {!!locales?.length && (
                      <div
                        className="flex justify-between items-center text-xs text-neutral-300"
                        onMouseEnter={languageToggleState.open}
                        onMouseLeave={languageToggleState.close}
                      >
                        <LanguageSelect
                          toggleState={languageToggleState}
                          locales={locales}
                          currentLocale={currentLocale}
                        />
                        <ArrowRightMini
                          className={clx(
                            "transition-transform duration-150",
                            languageToggleState.state ? "-rotate-90" : ""
                          )}
                        />
                      </div>
                    )}
                    <div
                      className="flex justify-between items-center text-xs text-neutral-300"
                      onMouseEnter={countryToggleState.open}
                      onMouseLeave={countryToggleState.close}
                    >
                      {regions && (
                        <CountrySelect
                          toggleState={countryToggleState}
                          regions={regions}
                        />
                      )}
                      <ArrowRightMini
                        className={clx(
                          "transition-transform duration-150",
                          countryToggleState.state ? "-rotate-90" : ""
                        )}
                      />
                    </div>
                    <Text className="text-[11px] text-neutral-500 pt-2">
                      © {new Date().getFullYear()} SpiceBox Store. All rights reserved.
                    </Text>
                  </div>
                </PopoverPanel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    </div>
  )
}

export default SideMenu
