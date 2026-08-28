"use client";

import React, { useState } from "react";

type PaymentMethod = "UPI" | "Card" | "NetBanking" | "Crypto";
type StepStatus = "idle" | "authorizing" | "capturing" | "settled";

export default function InteractiveSimulator() {
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "enterprise">("pro");
  const [method, setMethod] = useState<PaymentMethod>("UPI");
  const [status, setStatus] = useState<StepStatus>("idle");
  const [activeTab, setActiveTab] = useState<"ui" | "json">("ui");
  const [txId, setTxId] = useState<string>("pay_8912_xyz");

  const plans = {
    pro: { name: "Pro SaaS Tier", price: 29.0, currency: "USD", credits: "50,000 API calls" },
    enterprise: { name: "Scale Enterprise", price: 99.0, currency: "USD", credits: "Unlimited API calls" },
  };

  const handleSimulate = () => {
    setStatus("authorizing");
    const newTx = `pay_${Math.floor(1000 + Math.random() * 9000)}_${Math.random().toString(36).substring(2, 7)}`;
    setTxId(newTx);

    setTimeout(() => {
      setStatus("capturing");
      setTimeout(() => {
        setStatus("settled");
      }, 1200);
    }, 1000);
  };

  const handleReset = () => {
    setStatus("idle");
  };

  const currentPayload = {
    event: "payment.captured",
    created_at: Math.floor(Date.now() / 1000),
    data: {
      id: txId,
      amount: plans[selectedPlan].price * 100,
      currency: plans[selectedPlan].currency,
      status: status === "settled" ? "captured" : status,
      method: method.toLowerCase(),
      description: `Payment for ${plans[selectedPlan].name}`,
      fee: 0.58,
      tax: 0.10,
      error_code: null,
      notes: {
        plan: selectedPlan,
        environment: "production_live",
        customer_tier: "verified",
      },
    },
    signature: "sha256_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  };

  return (
    <section id="simulator" className="py-24 relative overflow-hidden bg-[#09090c]/80 border-t border-white/[0.06]">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 right-1/4 w-[450px] h-[350px] ambient-glow-purple pointer-events-none -z-10 blur-3xl opacity-50" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-semibold">
            <span>⚡</span> INTERACTIVE SANDBOX
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Simulate a Live Transaction
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg">
            Experience the entire payment lifecycle in real-time. Trigger an authorization, watch state progression, and inspect the dispatched webhook.
          </p>
        </div>

        {/* Sandbox Console Container */}
        <div className="mt-14 max-w-4xl mx-auto">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10">
            {/* Console Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-ping" />
                <span className="text-sm font-bold text-white font-mono">
                  Sandbox Engine v2.4
                </span>
              </div>

              {/* View Switcher: UI vs JSON Payload */}
              <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono">
                <button
                  onClick={() => setActiveTab("ui")}
                  className={`px-4 py-1.5 rounded-lg transition ${
                    activeTab === "ui"
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Interactive UI
                </button>
                <button
                  onClick={() => setActiveTab("json")}
                  className={`px-4 py-1.5 rounded-lg transition ${
                    activeTab === "json"
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Live Webhook Payload (JSON)
                </button>
              </div>
            </div>

            {/* Tab 1: Interactive UI */}
            {activeTab === "ui" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                {/* Left: Configuration Controls */}
                <div className="space-y-6">
                  {/* Plan Selector */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                      1. Select Plan / Checkout Item
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {(["pro", "enterprise"] as const).map((planKey) => {
                        const p = plans[planKey];
                        const isSelected = selectedPlan === planKey;
                        return (
                          <div
                            key={planKey}
                            onClick={() => {
                              setSelectedPlan(planKey);
                              if (status === "settled") setStatus("idle");
                            }}
                            className={`p-3.5 rounded-xl border cursor-pointer transition ${
                              isSelected
                                ? "bg-blue-600/15 border-blue-500 text-white"
                                : "bg-white/[0.02] border-white/10 hover:border-white/20 text-zinc-300"
                            }`}
                          >
                            <div className="text-xs font-bold font-sans">{p.name}</div>
                            <div className="text-lg font-bold font-mono text-white mt-1">
                              ${p.price}
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">{p.credits}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                      2. Payment Rail
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(["UPI", "Card", "NetBanking", "Crypto"] as PaymentMethod[]).map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            setMethod(m);
                            if (status === "settled") setStatus("idle");
                          }}
                          className={`py-2 px-3 rounded-lg text-xs font-mono transition border ${
                            method === m
                              ? "bg-white/10 border-white/30 text-white font-bold"
                              : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    {status === "idle" ? (
                      <button
                        onClick={handleSimulate}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-90 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>⚡ Authorize &amp; Process Payment</span>
                      </button>
                    ) : status === "settled" ? (
                      <button
                        onClick={handleReset}
                        className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm border border-white/15 transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>🔄 Reset Simulator</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-3.5 rounded-xl bg-blue-600/50 text-white font-medium text-sm flex items-center justify-center gap-2 cursor-wait"
                      >
                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>
                          {status === "authorizing" ? "Authorizing with Rail..." : "Capturing & Dispatching Webhook..."}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Right: Real-Time Progression Stream */}
                <div className="p-5 rounded-2xl bg-black/60 border border-white/10 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                      <span>Live State Machine</span>
                      <span className="text-[11px] font-mono text-zinc-500">{txId}</span>
                    </div>

                    {/* Step 1: Order Created */}
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                        ✓
                      </div>
                      <span className="text-zinc-300">Order Initialized ({plans[selectedPlan].currency} ${plans[selectedPlan].price})</span>
                    </div>

                    {/* Step 2: Rail Routing */}
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                        status !== "idle"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-zinc-800 text-zinc-500 border-zinc-700"
                      }`}>
                        {status !== "idle" ? "✓" : "2"}
                      </div>
                      <span className={status !== "idle" ? "text-zinc-200" : "text-zinc-500"}>
                        Rail Routed ({method} Gateway Cluster)
                      </span>
                    </div>

                    {/* Step 3: Payment Captured & Settled */}
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                        status === "settled"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : status === "capturing"
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse"
                          : "bg-zinc-800 text-zinc-500 border-zinc-700"
                      }`}>
                        {status === "settled" ? "✓" : "3"}
                      </div>
                      <span className={status === "settled" ? "text-emerald-400 font-bold" : "text-zinc-500"}>
                        {status === "settled" ? "Settled & Webhook Dispatched" : "Capture & Ledger Settlement"}
                      </span>
                    </div>
                  </div>

                  {/* Settlement Success Badge */}
                  {status === "settled" && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono animate-fade-in space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <span>🎉</span> Transaction Settled Successfully!
                      </div>
                      <div className="text-[11px] text-emerald-400/80">
                        Ledger synchronized in 89ms. Webhook event <code className="text-white">payment.captured</code> fired.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Tab 2: Live JSON Payload */
              <div className="pt-4">
                <div className="p-4 rounded-2xl bg-black/80 border border-white/10 overflow-x-auto">
                  <div className="flex justify-between items-center pb-2 mb-2 border-b border-white/10 text-xs font-mono text-zinc-400">
                    <span>POST /api/webhooks/razorpay</span>
                    <span className="text-emerald-400">200 OK</span>
                  </div>
                  <pre className="font-mono text-xs text-blue-300 leading-relaxed">
                    <code>{JSON.stringify(currentPayload, null, 2)}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
