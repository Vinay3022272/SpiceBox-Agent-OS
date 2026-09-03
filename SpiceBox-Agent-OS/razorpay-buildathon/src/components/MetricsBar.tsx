import React from "react";

export default function MetricsBar() {
  const metrics = [
    {
      value: "$450M+",
      label: "Gross Processed Volume",
      description: "Handled seamlessly through smart-routing algorithms.",
      gradient: "from-blue-500 to-cyan-400",
    },
    {
      value: "99.999%",
      label: "SLA Guaranteed Uptime",
      description: "Multi-region fallback cluster for zero disruption.",
      gradient: "from-indigo-500 to-purple-400",
    },
    {
      value: "<110ms",
      label: "Average Routing Latency",
      description: "Sub-second checkout completion and token verification.",
      gradient: "from-violet-500 to-pink-400",
    },
    {
      value: "140+",
      label: "Currencies & Multi-Rails",
      description: "Native UPI, Cards, NetBanking, and global gateways.",
      gradient: "from-emerald-400 to-teal-400",
    },
  ];

  return (
    <section className="py-12 border-y border-white/[0.06] bg-[#09090b]/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-all duration-300 group hover:-translate-y-1"
            >
              <div
                className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight bg-gradient-to-r ${metric.gradient} bg-clip-text text-transparent`}
              >
                {metric.value}
              </div>
              <div className="text-sm font-semibold text-zinc-200 mt-2">
                {metric.label}
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {metric.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
