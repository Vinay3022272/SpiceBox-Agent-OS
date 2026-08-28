import HeroSection from "@/components/HeroSection";
import MetricsBar from "@/components/MetricsBar";
import WorkflowSection from "@/components/WorkflowSection";
import InteractiveSimulator from "@/components/InteractiveSimulator";
import FeatureBento from "@/components/FeatureBento";
import ArchitectureFlow from "@/components/ArchitectureFlow";
import CtaBanner from "@/components/CtaBanner";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#080808] text-white">
      {/* 1. Monumental Hero with Interactive Canvas */}
      <HeroSection />

      {/* 2. Key Metrics & Impact Ticker */}
      <MetricsBar />

      {/* 3. How It Works (3-Stage Explanatory Lifecycle) */}
      <WorkflowSection />

      {/* 4. Live Interactive Payment & Webhook Simulator */}
      <InteractiveSimulator />

      {/* 5. Core Platform Capabilities Bento Grid */}
      <FeatureBento />

      {/* 6. End-to-End System Architecture Topology */}
      <ArchitectureFlow />

      {/* 7. Conversion Call-to-Action Banner */}
      <CtaBanner />

      {/* 8. Global Minimalist Dark Footer */}
      <Footer />
    </div>
  );
}
