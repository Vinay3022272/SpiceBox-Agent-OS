import React from "react";

export default function ArchitectureFlow() {
  const nodes = [
    {
      title: "1. Next.js Frontend",
      subtitle: "Client SDK & Clerk UI",
      desc: "Authenticates users with Clerk, renders Smart Checkout modal, and tracks UI status.",
      badge: "Edge Ready",
      color: "border-blue-500/40 text-blue-400 bg-blue-500/10",
    },
    {
      title: "2. Backend API Layer",
      subtitle: "Secure Server Actions",
      desc: "Validates Clerk JWTs, creates signed order tokens, and verifies HMAC signatures.",
      badge: "TypeScript",
      color: "border-indigo-500/40 text-indigo-400 bg-indigo-500/10",
    },
    {
      title: "3. Razorpay Orchestrator",
      subtitle: "Smart Multi-Rail Routing",
      desc: "Screens for fraud in real-time, optimizes bank rails, and tokenizes payment data.",
      badge: "Sub-100ms",
      color: "border-violet-500/40 text-violet-400 bg-violet-500/10",
    },
    {
      title: "4. Global Banking Rails",
      subtitle: "UPI, Cards & Gateways",
      desc: "Executes atomic financial settlement, sends instant OTPs, and confirms balances.",
      badge: "PCI-DSS L1",
      color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
    },
  ];

  return (
    <section id="architecture" className="py-24 relative overflow-hidden bg-[#09090c]/90 border-t border-white/[0.06]">
      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] ambient-glow-blue pointer-events-none -z-10 blur-3xl opacity-30" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-semibold">
            <span>&bull;</span> SYSTEM TOPOLOGY
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            End-to-End Architecture Flow
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg">
            Understand how each layer collaborates to guarantee sub-second, cryptographically verified financial operations.
          </p>
        </div>

        {/* Node Flow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-14 relative">
          {nodes.map((node, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 transition-all duration-300 relative flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${node.color}`}>
                    {node.badge}
                  </span>
                  <span className="text-xs font-mono text-zinc-500">
                    0{idx + 1}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition">
                  {node.title}
                </h3>
                <div className="text-xs font-mono text-zinc-400">
                  {node.subtitle}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed pt-2">
                  {node.desc}
                </p>
              </div>

              {/* Step indicator arrow for desktop */}
              {idx < nodes.length - 1 && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-zinc-600 font-bold">
                  &rarr;
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
