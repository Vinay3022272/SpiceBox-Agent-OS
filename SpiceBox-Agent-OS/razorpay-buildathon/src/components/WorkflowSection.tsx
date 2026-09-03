"use client";

import React, { useState } from "react";

export default function WorkflowSection() {
  const [activeStage, setActiveStage] = useState<number>(0);

  const stages = [
    {
      step: "01",
      title: "Connect & Authenticate",
      tag: "Setup in 2 Minutes",
      subtitle:
        "Initialize the client SDK, configure your Clerk authentication layer, and inject your secret keys.",
      details: [
        "Plug in Clerk User & Organization authentication for multi-tenant isolation.",
        "Generate test & live API credentials with granular permission scopes.",
        "Zero-config environment synchronization with Next.js Turbopack.",
      ],
      codeSnippet: `// 1. Initialize Clerk & SDK in your Next.js app
import { auth } from "@clerk/nextjs/server";
import { RazorpayGateway } from "@/lib/razorpay";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const order = await RazorpayGateway.createOrder({
    amount: 4999, // in cents/paise
    currency: "USD",
    receipt: \`rcpt_\${userId}\`,
  });

  return Response.json(order);
}`,
    },
    {
      step: "02",
      title: "Orchestrate & Process",
      tag: "Intelligent Multi-Rail",
      subtitle:
        "Serve drop-in smart checkout or headless APIs with automatic fallback across banking networks.",
      details: [
        "Instant payment methods: UPI Intent, Card Tokenization, NetBanking, and Wallets.",
        "Dynamic routing engine automatically reroutes around bank outages.",
        "Built-in 3D Secure v2 authentication and real-time fraud risk scoring.",
      ],
      codeSnippet: `// 2. Client-side Checkout Trigger
const options = {
  key: process.env.NEXT_PUBLIC_KEY,
  amount: order.amount,
  currency: order.currency,
  name: "Razorpay Cloud SaaS",
  handler: function (response) {
    verifyPaymentSignature({
      paymentId: response.razorpay_payment_id,
      orderId: response.razorpay_order_id,
      signature: response.razorpay_signature
    });
  }
};
const rzp = new window.Razorpay(options);
rzp.open();`,
    },
    {
      step: "03",
      title: "Settle & Analyze",
      tag: "Real-time Ledger",
      subtitle:
        "Receive cryptographically signed webhooks, sync balances, and monitor financial metrics in real-time.",
      details: [
        "Sub-second webhook dispatches with HMAC SHA256 signature verification.",
        "Automatic payouts, invoice generation, and refunds orchestration.",
        "Real-time analytics dashboard with revenue charts and exportable reports.",
      ],
      codeSnippet: `// 3. Webhook Listener & Event Processing
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  const isValid = verifyWebhookSignature(body, signature, SECRET);
  if (!isValid) return new Response("Invalid signature", { status: 400 });

  const event = JSON.parse(body);
  if (event.event === "payment.captured") {
    await fulfillOrderAndSyncLedger(event.payload.payment.entity);
  }

  return new Response("OK", { status: 200 });
}`,
    },
  ];

  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[500px] h-[500px] ambient-glow-blue pointer-events-none -z-10 blur-3xl opacity-40" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-semibold">
            <span>&bull;</span> ARCHITECTURAL WORKFLOW
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            How It Works: The 3-Stage Lifecycle
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg">
            From initial authentication to multi-rail routing and automatic ledger settlement, see how our unified stack orchestrates your transactions.
          </p>
        </div>

        {/* Interactive Stages Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-14 items-start">
          {/* Left Column: Stage Selectors (Outcrowd-inspired) */}
          <div className="lg:col-span-5 space-y-4">
            {stages.map((stage, idx) => {
              const isSelected = activeStage === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setActiveStage(idx)}
                  className={`p-6 rounded-2xl cursor-pointer transition-all duration-300 border ${
                    isSelected
                      ? "bg-gradient-to-br from-white/[0.08] to-white/[0.02] border-blue-500/50 shadow-xl shadow-blue-500/10"
                      : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/15"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-white/10 text-zinc-400"
                        }`}
                      >
                        STEP {stage.step}
                      </span>
                      <span className="text-xs font-mono text-zinc-400">
                        {stage.tag}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white mt-3">
                    {stage.title}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                    {stage.subtitle}
                  </p>

                  {isSelected && (
                    <ul className="mt-4 space-y-2 pt-4 border-t border-white/10">
                      {stage.details.map((detail, dIdx) => (
                        <li
                          key={dIdx}
                          className="flex items-start gap-2 text-xs text-zinc-300"
                        >
                          <svg
                            className="w-4 h-4 text-blue-400 shrink-0 mt-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Code & Interactive Architecture Canvas */}
          <div className="lg:col-span-7">
            <div className="glass-panel rounded-3xl p-6 relative overflow-hidden shadow-2xl">
              {/* Window Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs font-mono text-zinc-400 ml-2">
                    {activeStage === 0
                      ? "api/v2/orders/route.ts"
                      : activeStage === 1
                      ? "components/CheckoutModal.tsx"
                      : "api/webhooks/razorpay/route.ts"}
                  </span>
                </div>
                <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  TypeScript
                </span>
              </div>

              {/* Code Display */}
              <div className="pt-4 overflow-x-auto">
                <pre className="font-mono text-xs text-zinc-300 leading-relaxed">
                  <code>{stages[activeStage].codeSnippet}</code>
                </pre>
              </div>

              {/* Bottom State Badge */}
              <div className="mt-6 p-4 rounded-xl bg-black/50 border border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Clerk Session: Validated &amp; Active</span>
                </div>
                <div className="text-zinc-500">
                  Step {activeStage + 1} of 3
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
