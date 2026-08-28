"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Show, SignUpButton } from "@clerk/nextjs";

export default function CtaBanner() {
  const [copied, setCopied] = useState(false);
  const installCmd = "npm install @clerk/nextjs razorpay";

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl p-8 sm:p-14 overflow-hidden border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-2xl">
          {/* Radiant glow behind card */}
          <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-bl from-blue-600/20 via-indigo-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-purple-600/20 via-pink-600/10 to-transparent blur-3xl pointer-events-none -z-10" />

          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-semibold">
              ⚡ READY FOR PRODUCTION
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Ready to Accelerate Your Platform&apos;s Financial Engine?
            </h2>

            <p className="text-zinc-300 text-base sm:text-lg max-w-2xl leading-relaxed">
              Launch your checkout in minutes, secure user logins with Clerk, and manage everything from the real-time analytics dashboard.
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Show when="signed-out">
                <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                  <button className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-90 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition cursor-pointer">
                    Get Started Free &rarr;
                  </button>
                </SignUpButton>
              </Show>

              <Show when="signed-in">
                <Link
                  href="/dashboard"
                  className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-90 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition"
                >
                  Open Live Dashboard &rarr;
                </Link>
              </Show>

              {/* Copy Install Command */}
              <button
                onClick={handleCopy}
                className="px-5 py-3.5 rounded-xl bg-black/60 hover:bg-black/80 text-zinc-300 hover:text-white font-mono text-xs border border-white/10 hover:border-white/20 transition flex items-center gap-2.5 cursor-pointer"
              >
                <span>{installCmd}</span>
                <span className="text-blue-400 font-sans font-medium">
                  {copied ? "Copied! ✓" : "Copy"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
