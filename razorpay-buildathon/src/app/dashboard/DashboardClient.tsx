"use client";

import React, { useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

interface DashboardClientProps {
  user: {
    id: string;
    fullName: string | null;
    firstName: string | null;
    email: string | undefined;
    imageUrl?: string;
  };
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "apikeys" | "webhooks">("overview");
  const [copiedKey, setCopiedKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [newLinkAmount, setNewLinkAmount] = useState("49.00");
  const [newLinkDesc, setNewLinkDesc] = useState("Pro SaaS Plan");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const mockTransactions = [
    {
      id: "pay_9821_a7b",
      customer: "Sarah Jenkins",
      email: "sarah.j@enterprise.io",
      amount: "$99.00",
      rail: "Card (Visa •••• 4242)",
      status: "Captured",
      date: "Today, 14:32",
    },
    {
      id: "pay_9820_k2m",
      customer: "Alex Chen",
      email: "alex.c@startup.co",
      amount: "$29.00",
      rail: "UPI (alexc@okaxis)",
      status: "Captured",
      date: "Today, 12:15",
    },
    {
      id: "pay_9819_p9x",
      customer: "Elena Rostova",
      email: "elena@designhub.com",
      amount: "$499.00",
      rail: "Card (Mastercard •••• 8812)",
      status: "Settled",
      date: "Yesterday, 19:40",
    },
    {
      id: "pay_9818_q1w",
      customer: "Marcus Vance",
      email: "marcus@vancecap.com",
      amount: "$99.00",
      rail: "NetBanking (HDFC Bank)",
      status: "Captured",
      date: "Yesterday, 16:02",
    },
    {
      id: "pay_9817_l4v",
      customer: "Liam O'Connor",
      email: "liam@fintechlabs.ie",
      amount: "$29.00",
      rail: "UPI (liam@upi)",
      status: "Settled",
      date: "Aug 26, 11:22",
    },
  ];

  const handleGenerateLink = (e: React.FormEvent) => {
    e.preventDefault();
    const linkId = `pl_${Math.random().toString(36).substring(2, 9)}`;
    setGeneratedLink(`https://pay.razorpay.me/${linkId}`);
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(`rzp_live_${user.id.substring(0, 16)}_secret`);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white pt-24 pb-20">
      {/* Background radial glow */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[350px] ambient-glow-blue pointer-events-none -z-10 blur-3xl opacity-30" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/[0.08]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-[1px] shadow-lg shadow-blue-500/20">
              <div className="w-full h-full bg-[#0d0d11] rounded-[15px] flex items-center justify-center font-bold text-lg text-blue-400">
                {user.firstName ? user.firstName[0].toUpperCase() : "U"}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Welcome, {user.firstName || user.fullName || "User"}!
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live Merchant
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-mono mt-1">
                <span>{user.email}</span>
                <span>&bull;</span>
                <span className="text-zinc-500">ID: {user.id}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions / User Profile */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono text-zinc-300 border border-white/10 transition"
            >
              &larr; Back to Home
            </Link>
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white/[0.04] border border-white/10">
              <UserButton />
            </div>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto py-6 border-b border-white/[0.06]">
          {[
            { id: "overview", label: "Financial Overview", icon: "📊" },
            { id: "transactions", label: "Live Transactions", icon: "💳" },
            { id: "apikeys", label: "API Credentials", icon: "🔑" },
            { id: "webhooks", label: "Webhooks & Events", icon: "⚡" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-mono transition flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20"
                  : "bg-white/[0.02] border border-white/5 text-zinc-400 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8 pt-8">
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-6 rounded-2xl glass-panel relative overflow-hidden">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Total Gross Revenue
                </span>
                <div className="text-3xl font-extrabold font-mono text-white mt-2">
                  $128,450.00
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-mono mt-2">
                  <span>&uarr; +14.2%</span>
                  <span className="text-zinc-500">vs last 30 days</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl glass-panel relative overflow-hidden">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Successful Payments
                </span>
                <div className="text-3xl font-extrabold font-mono text-white mt-2">
                  1,842
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-mono mt-2">
                  <span>99.6%</span>
                  <span className="text-zinc-500">routing authorization</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl glass-panel relative overflow-hidden">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Active Subscribers
                </span>
                <div className="text-3xl font-extrabold font-mono text-white mt-2">
                  640
                </div>
                <div className="flex items-center gap-1 text-xs text-blue-400 font-mono mt-2">
                  <span>+28</span>
                  <span className="text-zinc-500">new this month</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl glass-panel relative overflow-hidden">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Webhook Deliveries
                </span>
                <div className="text-3xl font-extrabold font-mono text-white mt-2">
                  14,290
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-mono mt-2">
                  <span>100.00%</span>
                  <span className="text-zinc-500">delivered</span>
                </div>
              </div>
            </div>

            {/* Two-Column Grid: Quick Link Generator & Recent Ledger */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Payment Link Generator */}
              <div className="lg:col-span-4 glass-panel rounded-3xl p-6 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>⚡</span> Create Quick Payment Link
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Generate an instant shareable payment link for your customers.
                  </p>
                </div>

                <form onSubmit={handleGenerateLink} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">
                      Amount (USD)
                    </label>
                    <input
                      type="number"
                      value={newLinkAmount}
                      onChange={(e) => setNewLinkAmount(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                      placeholder="49.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">
                      Description / Item
                    </label>
                    <input
                      type="text"
                      value={newLinkDesc}
                      onChange={(e) => setNewLinkDesc(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500"
                      placeholder="Pro SaaS Subscription"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition cursor-pointer"
                  >
                    Generate Payment Link
                  </button>
                </form>

                {generatedLink && (
                  <div className="p-3.5 rounded-xl bg-blue-600/10 border border-blue-500/30 text-xs font-mono space-y-2">
                    <span className="text-blue-300 font-semibold block">
                      ✓ Link Ready:
                    </span>
                    <div className="p-2 rounded bg-black/50 text-zinc-300 break-all select-all">
                      {generatedLink}
                    </div>
                  </div>
                )}
              </div>

              {/* Transactions Stream Preview */}
              <div className="lg:col-span-8 glass-panel rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>💳</span> Real-Time Transaction Ledger
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Latest payments authorized and settled in your merchant account.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("transactions")}
                    className="text-xs font-mono text-blue-400 hover:text-blue-300 transition"
                  >
                    View All &rarr;
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-500 uppercase tracking-wider text-[10px]">
                        <th className="pb-3 font-semibold">Tx ID</th>
                        <th className="pb-3 font-semibold">Customer</th>
                        <th className="pb-3 font-semibold">Rail</th>
                        <th className="pb-3 font-semibold">Amount</th>
                        <th className="pb-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {mockTransactions.slice(0, 4).map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/[0.02] transition">
                          <td className="py-3 text-zinc-300 font-bold">{tx.id}</td>
                          <td className="py-3 text-zinc-300">
                            <div>{tx.customer}</div>
                            <div className="text-[10px] text-zinc-500">{tx.email}</div>
                          </td>
                          <td className="py-3 text-zinc-400">{tx.rail}</td>
                          <td className="py-3 text-white font-bold">{tx.amount}</td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: TRANSACTIONS */}
        {activeTab === "transactions" && (
          <div className="pt-8 space-y-6">
            <div className="glass-panel rounded-3xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div>
                  <h2 className="text-xl font-bold text-white">Full Transaction History</h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    All payment intents, charges, and settlement events for your account.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-zinc-400">Filter:</span>
                  <select className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-zinc-300 focus:outline-none">
                    <option>All Rails (UPI, Cards, Bank)</option>
                    <option>UPI Only</option>
                    <option>Cards Only</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto pt-4">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-500 uppercase tracking-wider text-[10px]">
                      <th className="pb-3 font-semibold">Transaction ID</th>
                      <th className="pb-3 font-semibold">Customer</th>
                      <th className="pb-3 font-semibold">Rail / Method</th>
                      <th className="pb-3 font-semibold">Timestamp</th>
                      <th className="pb-3 font-semibold">Amount</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {mockTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-4 text-blue-400 font-bold">{tx.id}</td>
                        <td className="py-4 text-zinc-200">
                          <div className="font-semibold">{tx.customer}</div>
                          <div className="text-[10px] text-zinc-500">{tx.email}</div>
                        </td>
                        <td className="py-4 text-zinc-400">{tx.rail}</td>
                        <td className="py-4 text-zinc-500">{tx.date}</td>
                        <td className="py-4 text-white font-bold text-sm">{tx.amount}</td>
                        <td className="py-4">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: API KEYS */}
        {activeTab === "apikeys" && (
          <div className="pt-8 space-y-6">
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">API Credentials &amp; Access Tokens</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Use these credentials to authenticate requests from your backend server.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                      Merchant Key ID (Public)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 font-mono text-xs text-zinc-300">
                    <span className="break-all">rzp_live_{user.id.substring(0, 18)}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`rzp_live_${user.id.substring(0, 18)}`);
                        setCopiedKey(true);
                        setTimeout(() => setCopiedKey(false), 2000);
                      }}
                      className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition text-xs shrink-0 cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                      Key Secret (Private)
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Confidential
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 font-mono text-xs text-zinc-300">
                    <span>
                      {showKey
                        ? `rzp_sec_${user.id.replace(/[^a-zA-Z0-9]/g, "")}_k883`
                        : "••••••••••••••••••••••••••••••••••••••••"}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition text-xs cursor-pointer"
                      >
                        {showKey ? "Hide" : "Reveal"}
                      </button>
                      <button
                        onClick={handleCopyApiKey}
                        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition text-xs font-sans cursor-pointer"
                      >
                        {copiedKey ? "Copied! ✓" : "Copy Secret"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: WEBHOOKS */}
        {activeTab === "webhooks" && (
          <div className="pt-8 space-y-6">
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Webhook Configuration</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Configure real-time event notifications for payment captures, refunds, and subscriptions.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Endpoint Status: Verified (200 OK)</span>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">HMAC SHA-256</span>
                </div>
                <div className="p-3 rounded-xl bg-black border border-white/10 font-mono text-xs text-blue-300">
                  https://your-domain.com/api/webhooks/razorpay
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {["payment.captured", "order.paid", "subscription.renewed", "refund.processed"].map((event) => (
                    <span
                      key={event}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-zinc-300"
                    >
                      {event}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
