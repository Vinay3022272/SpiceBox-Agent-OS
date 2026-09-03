"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Show, SignUpButton } from "@clerk/nextjs";

export default function HeroSection() {
  const [liveStreamAmount, setLiveStreamAmount] = useState(4820);
  const [activeRail, setActiveRail] = useState<"UPI" | "Card" | "NetBanking" | "Crypto">("UPI");
  const [simulatedTxCount, setSimulatedTxCount] = useState(14892);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveStreamAmount((prev) => prev + Math.floor(Math.random() * 45) + 10);
      setSimulatedTxCount((prev) => prev + 1);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative pt-32 pb-20 md:pt-44 md:pb-28 overflow-hidden bg-grid-pattern">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] ambient-glow-purple pointer-events-none -z-10 blur-3xl opacity-70" />
      <div className="absolute top-1/3 left-1/4 w-[450px] h-[250px] ambient-glow-blue pointer-events-none -z-10 blur-3xl opacity-50" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
          {/* Outcrowd-style Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md text-xs font-medium text-zinc-300 shadow-xl hover:border-white/20 transition cursor-default">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="tracking-wide uppercase text-[11px] font-mono font-semibold text-blue-300">
              Next-Gen Orchestration Engine
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">Production-Ready Payments</span>
          </div>

          {/* Monumental Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08]">
            Frictionless Financial{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
              Infrastructure
            </span>{" "}
            for Modern SaaS
          </h1>

          {/* Subtitle explaining the system */}
          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl font-normal leading-relaxed">
            Power your digital platform with drop-in smart checkout, multi-rail UPI/Card routing, automated subscription billing, and real-time webhook intelligence.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a
              href="#simulator"
              className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-medium text-sm shadow-xl shadow-blue-500/20 hover:shadow-blue-500/35 hover:-translate-y-0.5 transition duration-200 flex items-center gap-2 group"
            >
              <svg
                className="w-4 h-4 text-blue-200 group-hover:rotate-12 transition"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Launch Live Simulator
            </a>

            <Show when="signed-out">
              <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                <button className="px-6 py-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium text-sm border border-white/10 hover:border-white/20 transition duration-200 flex items-center gap-2 cursor-pointer">
                  <span>Create Free Account</span>
                  <span className="text-zinc-400">&rarr;</span>
                </button>
              </SignUpButton>
            </Show>

            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="px-6 py-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium text-sm border border-white/10 hover:border-white/20 transition duration-200 flex items-center gap-2"
              >
                <span>Go to Dashboard</span>
                <span className="text-blue-400">&rarr;</span>
              </Link>
            </Show>

            <a
              href="#how-it-works"
              className="px-5 py-3.5 rounded-xl text-zinc-400 hover:text-white font-medium text-sm transition"
            >
              How It Works &darr;
            </a>
          </div>
        </div>

        {/* Dynamic Visual Showcase Canvas */}
        <div className="mt-16 sm:mt-20 max-w-5xl mx-auto">
          <div className="glass-panel rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
            {/* Top Bar of Canvas */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-mono text-zinc-400 ml-2">
                  gateway.live.razorpay-orchestrator/v2
                </span>
              </div>

              {/* Payment Rails Selector */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/5 text-xs font-mono">
                {(["UPI", "Card", "NetBanking", "Crypto"] as const).map((rail) => (
                  <button
                    key={rail}
                    onClick={() => setActiveRail(rail)}
                    className={`px-3 py-1 rounded-lg transition ${
                      activeRail === rail
                        ? "bg-blue-600 text-white font-semibold shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {rail}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Interactive Preview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-6">
              {/* Card 1: Live Volume & Stream */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Live Processed Volume
                  </span>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    +18.4% today
                  </span>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
                    ${liveStreamAmount.toLocaleString()}.80
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Settled across 14 payment nodes
                  </p>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full w-4/5 animate-pulse" />
                </div>
              </div>

              {/* Card 2: Multi-Rail Routing Engine */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Active Rail Routing
                  </span>
                  <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                    Smart Fallback On
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      Rail Selected:
                    </span>
                    <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded">
                      {activeRail}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-zinc-400">
                    <span>Target Latency:</span>
                    <span className="font-mono text-emerald-400">84ms</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-zinc-400">
                    <span>Fraud Threat Index:</span>
                    <span className="font-mono text-emerald-400">0.01% (Safe)</span>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-zinc-500 bg-black/40 p-2 rounded-lg border border-white/5">
                  &gt; Route optimized: Bank API cluster #4
                </div>
              </div>

              {/* Card 3: Real-Time Stream Status */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    System Telemetry
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Operational
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="text-2xl font-bold font-mono text-white">
                    {simulatedTxCount.toLocaleString()}
                  </div>
                  <p className="text-xs text-zinc-400">
                    Captured events in current window
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-zinc-400 font-mono">
                  <span>Clerk Session:</span>
                  <span className="text-zinc-300">Protected (JWT)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
