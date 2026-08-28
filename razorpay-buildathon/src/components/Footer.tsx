import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#070709] py-14 text-zinc-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center p-[1px]">
                <div className="w-full h-full bg-[#0d0d11] rounded-[7px] flex items-center justify-center">
                  <svg
                    className="w-3.5 h-3.5 text-blue-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
              </div>
              <span className="font-bold text-white text-base">Razorpay Platform</span>
            </Link>
            <p className="text-zinc-400 max-w-sm text-xs leading-relaxed">
              Unified payment orchestration, intelligent multi-rail routing, and instant ledger balance synchronization for high-growth software teams.
            </p>
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              All Payment Gateways Operational (100.00% uptime)
            </div>
          </div>

          {/* Col 1 */}
          <div className="space-y-3">
            <div className="text-white font-semibold text-xs uppercase font-mono tracking-wider">
              Product
            </div>
            <ul className="space-y-2">
              <li><a href="#how-it-works" className="hover:text-white transition">How It Works</a></li>
              <li><a href="#simulator" className="hover:text-white transition">Live Simulator</a></li>
              <li><a href="#features" className="hover:text-white transition">Smart Checkout</a></li>
              <li><a href="#features" className="hover:text-white transition">Subscriptions</a></li>
            </ul>
          </div>

          {/* Col 2 */}
          <div className="space-y-3">
            <div className="text-white font-semibold text-xs uppercase font-mono tracking-wider">
              Developers
            </div>
            <ul className="space-y-2">
              <li><a href="https://clerk.com/docs" target="_blank" rel="noreferrer" className="hover:text-white transition">Clerk Auth Docs</a></li>
              <li><a href="https://razorpay.com/docs" target="_blank" rel="noreferrer" className="hover:text-white transition">Razorpay API Ref</a></li>
              <li><a href="#architecture" className="hover:text-white transition">System Architecture</a></li>
              <li><a href="https://dashboard.clerk.com" target="_blank" rel="noreferrer" className="hover:text-white transition">Clerk Dashboard</a></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-3">
            <div className="text-white font-semibold text-xs uppercase font-mono tracking-wider">
              Security
            </div>
            <ul className="space-y-2">
              <li><span className="text-zinc-300">PCI-DSS Level 1</span></li>
              <li><span className="text-zinc-300">AES-256 Encryption</span></li>
              <li><span className="text-zinc-300">3D Secure v2 OTP</span></li>
              <li><span className="text-zinc-300">HMAC SHA256 Webhooks</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-400 text-xs">
          <div>
            &copy; {new Date().getFullYear()} Razorpay Platform. Inspired by Outcrowd Design Aesthetics.
          </div>
          <div className="flex gap-6 font-mono text-[11px]">
            <span>Next.js 16</span>
            <span>Clerk SDK</span>
            <span>Tailwind v4</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
