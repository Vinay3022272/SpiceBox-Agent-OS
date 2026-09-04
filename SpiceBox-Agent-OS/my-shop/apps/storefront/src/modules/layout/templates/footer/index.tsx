import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { Text, clx } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default async function Footer() {
  const { collections } = await listCollections({
    fields: "*products",
  })
  const productCategories = await listCategories()

  return (
    <footer className="bg-neutral-950 border-t border-neutral-800 text-neutral-400 w-full mt-24">
      <div className="content-container flex flex-col w-full pt-16 pb-12">
        {/* Main 4-Column Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12 pb-14 border-b border-neutral-800/80">
          
          {/* Col 1: Brand & AI Store Info (5 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <LocalizedClientLink
              href="/"
              className="flex items-center gap-2.5 text-white font-black text-lg tracking-tight uppercase group"
            >
              <span className="w-8 h-8 rounded-lg bg-white text-neutral-950 flex items-center justify-center font-bold text-sm shadow-md">
                S
              </span>
              <span className="tracking-tight font-extrabold text-base text-white">
                SPICEBOX STORE
              </span>
            </LocalizedClientLink>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-sm">
              Next-generation commerce experience powered by autonomous Agent OS knowledge graphs, live conversational upselling, and instant UPI QR payments.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 text-[11px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                AI Shopkeeper Active
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 text-[11px] font-medium">
                ⚡ Razorpay UPI
              </span>
            </div>
          </div>

          {/* Col 2: Top Categories (3 cols) */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">
              Categories
            </h4>
            <ul className="flex flex-col gap-2 text-xs" data-testid="footer-categories">
              {productCategories?.slice(0, 7).map((c) => {
                if (c.parent_category) return null
                return (
                  <li key={c.id}>
                    <LocalizedClientLink
                      className="text-neutral-400 hover:text-white transition-colors"
                      href={`/categories/${c.handle}`}
                      data-testid="category-link"
                    >
                      {c.name}
                    </LocalizedClientLink>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Col 3: Quick Navigation (2 cols) */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">
              Shop & Account
            </h4>
            <ul className="flex flex-col gap-2 text-xs">
              <li>
                <LocalizedClientLink
                  className="text-neutral-400 hover:text-white transition-colors"
                  href="/store"
                >
                  All Products
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink
                  className="text-neutral-400 hover:text-white transition-colors"
                  href="/cart"
                >
                  Shopping Cart
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink
                  className="text-neutral-400 hover:text-white transition-colors"
                  href="/account"
                >
                  My Account
                </LocalizedClientLink>
              </li>
              {collections?.slice(0, 3).map((col) => (
                <li key={col.id}>
                  <LocalizedClientLink
                    className="text-neutral-400 hover:text-white transition-colors"
                    href={`/collections/${col.handle}`}
                  >
                    {col.title}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Customer Trust & Payment Methods (3 cols) */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">
              Secure Checkout
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Instant checkout with real-time UPI QR codes and Razorpay direct settlement.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-[11px] font-semibold text-neutral-300">
                UPI / QR
              </span>
              <span className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-[11px] font-semibold text-neutral-300">
                Google Pay
              </span>
              <span className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-[11px] font-semibold text-neutral-300">
                PhonePe
              </span>
              <span className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-[11px] font-semibold text-neutral-300">
                Cards
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-xs text-neutral-400">
          <Text className="text-xs text-neutral-400">
            © {new Date().getFullYear()} SpiceBox Store. All rights reserved. Powered by Medusa 2.0 & Agent OS.
          </Text>
          <div className="flex items-center gap-4 text-xs text-neutral-400">
            <span className="hover:text-neutral-300 transition-colors cursor-pointer">
              Privacy Policy
            </span>
            <span>•</span>
            <span className="hover:text-neutral-300 transition-colors cursor-pointer">
              Terms of Service
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
