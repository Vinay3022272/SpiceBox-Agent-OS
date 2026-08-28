import React from "react";

export default function FeatureBento() {
  const features = [
    {
      title: "Drop-In Smart Checkout SDK",
      tag: "Conversion-Optimized",
      description:
        "One line of code embeds a lightning-fast payment interface that automatically adapts to the customer's device, currency, and favorite payment rails.",
      badge: "1-Click Checkout",
      colSpan: "md:col-span-2",
      gradient: "from-blue-600/20 to-indigo-600/10",
      icon: (
        <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      title: "Automated Subscriptions",
      tag: "Recurring Billing",
      description:
        "Effortlessly manage SaaS tiers, usage-based credits, free trials, and smart automated dunning retries.",
      badge: "Zero Churn",
      colSpan: "md:col-span-1",
      gradient: "from-purple-600/20 to-pink-600/10",
      icon: (
        <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      title: "Real-Time Webhook Engine",
      tag: "Sub-Second Delivery",
      description:
        "Cryptographically signed HMAC payloads dispatched in under 50ms with automatic exponential retry pipelines.",
      badge: "99.999% Delivery",
      colSpan: "md:col-span-1",
      gradient: "from-emerald-600/20 to-teal-600/10",
      icon: (
        <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      title: "Enterprise Shield & PCI-DSS",
      tag: "Zero-Trust Architecture",
      description:
        "Bank-grade tokenization, AES-256 encryption at rest, automatic 3D Secure v2 challenges, and AI fraud score screening.",
      badge: "Level 1 Certified",
      colSpan: "md:col-span-2",
      gradient: "from-indigo-600/20 to-blue-600/10",
      icon: (
        <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-mono font-semibold">
            <span>&bull;</span> CORE CAPABILITIES
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Engineered for Uncompromising Scale
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg">
            Everything your product needs to process payments, manage billing, and scale globally without complex custom integrations.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
          {features.map((f, idx) => (
            <div
              key={idx}
              className={`${f.colSpan} p-8 rounded-3xl bg-gradient-to-br ${f.gradient} border border-white/[0.08] hover:border-white/20 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-2xl bg-white/[0.05] border border-white/10 w-fit">
                    {f.icon}
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-zinc-300">
                    {f.badge}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    {f.tag}
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">
                    {f.title}
                  </h3>
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed">
                  {f.description}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-xs font-mono text-zinc-400 group-hover:text-white transition">
                <span>Integrated into SDK</span>
                <span>&rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
