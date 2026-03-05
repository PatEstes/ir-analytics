/*
 * Home.tsx — Observatory Design
 * Landing page with hero, CSV upload, and demo data option.
 * Dark navy background, cyan accents, Space Grotesk headings, JetBrains Mono data.
 */

import { useCallback, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { Upload, Play, FileText, Shield, Cpu, BarChart3, TrendingUp, Quote, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/91938469/6FYu2YaQLcgd9kxSPsmadU/hero-bg-LWvRs5fmFdq8mp5G8DvZq2.webp";
const UPLOAD_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/91938469/6FYu2YaQLcgd9kxSPsmadU/upload-illustration-WAbeHZWXvoSjkweBPCwYNq.webp";

const features = [
  { icon: Shield, title: "FERPA-Safe", desc: "All processing runs locally. No data leaves your browser." },
  { icon: Cpu, title: "Guided Topic Modeling", desc: "BERTopic with higher-ed seed themes discovers meaningful topics." },
  { icon: BarChart3, title: "Sentiment Analysis", desc: "VADER classifies every comment as Positive, Negative, or Neutral." },
  { icon: TrendingUp, title: "Trend Detection", desc: "Weekly frequency analysis flags emerging issues automatically." },
  { icon: Quote, title: "Representative Quotes", desc: "Surfaces the most representative comments for each theme." },
  { icon: CheckCircle2, title: "Topic Validation", desc: "Coherence scores and noise ratios ensure quality results." },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { runAnalysis, loadDemo, isProcessing, progress, progressLabel } = useAnalytics();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) return;
    await runAnalysis(file);
    navigate("/dashboard");
  }, [runAnalysis, navigate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDemo = useCallback(async () => {
    await loadDemo();
    navigate("/dashboard");
  }, [loadDemo, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${HERO_BG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />

        <div className="relative container pt-16 pb-24 sm:pt-24 sm:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-6">
              <Shield className="w-3.5 h-3.5" />
              FERPA-Safe &middot; 100% Local Processing
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6" style={{ fontFamily: "var(--font-heading)" }}>
              IR Qualitative
              <br />
              <span className="text-primary">Analytics Engine</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              Transform open-ended survey responses into structured qualitative insights.
              Discover themes, sentiment patterns, and emerging trends — all within your browser.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Upload Section */}
      <section className="container -mt-8 relative z-10 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          {isProcessing ? (
            <div className="panel p-8 glow-border-active">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                    Processing Analysis
                  </h2>
                  <p className="text-sm text-muted-foreground">{progressLabel}</p>
                </div>
              </div>
              <Progress value={progress} className="h-2 mb-3" />
              <p className="text-right text-sm font-mono text-primary">{progress}%</p>
            </div>
          ) : (
            <div
              className={`panel p-8 transition-all duration-200 ${dragOver ? "glow-border-active" : "glow-border"}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="flex flex-col lg:flex-row gap-8 items-center">
                <div className="w-full lg:w-48 h-40 lg:h-48 rounded-lg overflow-hidden shrink-0 bg-secondary/50">
                  <img src={UPLOAD_IMG} alt="Upload" className="w-full h-full object-cover opacity-80" />
                </div>
                <div className="flex-1 text-center lg:text-left">
                  <h2 className="text-2xl font-semibold mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                    Upload Survey Data
                  </h2>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Drop a Qualtrics CSV file here, or click to browse. Your data stays in the browser — nothing is uploaded to any server.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                    <Button
                      size="lg"
                      className="gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4" />
                      Choose CSV File
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
                      onClick={handleDemo}
                    >
                      <Play className="w-4 h-4" />
                      Run Demo Analysis
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                    }}
                  />
                </div>
              </div>

              {/* Expected format hint */}
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs text-muted-foreground flex items-center gap-2 mb-2">
                  <FileText className="w-3.5 h-3.5" />
                  Expected CSV columns:
                </p>
                <div className="flex flex-wrap gap-2">
                  {["ResponseID", "Institution", "School", "ProgramLevel", "SurveyDate", "Comment_Text"].map((col) => (
                    <span key={col} className="px-2 py-0.5 rounded text-xs font-mono bg-secondary text-secondary-foreground">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="container pb-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-heading)" }}>
            Complete Qualitative Analysis Pipeline
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From raw survey data to actionable insights — every step runs locally on your machine.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * i }}
              className="panel p-6 group hover:glow-border transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1" style={{ fontFamily: "var(--font-heading)" }}>{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="container pb-24">
        <div className="panel p-8 lg:p-12 glow-border overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-heading)" }}>
                How It Works
              </h2>
              <div className="space-y-4">
                {[
                  { step: "01", title: "Upload CSV", desc: "Drop your Qualtrics survey export. We accept standard CSV with comment text columns." },
                  { step: "02", title: "Automated Analysis", desc: "BERTopic discovers themes, VADER scores sentiment, and trend detection flags emerging issues." },
                  { step: "03", title: "Interactive Dashboard", desc: "Explore themes, sentiment breakdowns, trend lines, representative quotes, and validation metrics." },
                  { step: "04", title: "Export & Report", desc: "Download CSV datasets for Power BI, Tableau, or any reporting tool." },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4 items-start">
                    <span className="stat-number text-lg font-bold text-primary shrink-0">{item.step}</span>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ fontFamily: "var(--font-heading)" }}>{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full lg:w-96 shrink-0">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/91938469/6FYu2YaQLcgd9kxSPsmadU/analysis-illustration-VMomsoV4FybLf3abuuhPTM.webp"
                alt="Analysis pipeline visualization"
                className="w-full rounded-lg opacity-80"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          IR Qualitative Analytics Engine &middot; FERPA-Safe &middot; All processing runs locally
        </div>
      </footer>
    </div>
  );
}
