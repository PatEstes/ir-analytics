/*
 * Dashboard.tsx — Observatory Design
 * Main analytics dashboard with 6 tabs:
 *   Summary, Themes, Sentiment, Trends, Quotes, Validation
 * Dark navy background, cyan accents, glowing panels.
 */

import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  FileText,
  BarChart3,
  SmilePlus,
  TrendingUp,
  Quote,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Hash,
  Percent,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const TABS = [
  { id: "summary", label: "Summary", icon: FileText },
  { id: "themes", label: "Themes", icon: BarChart3 },
  { id: "sentiment", label: "Sentiment", icon: SmilePlus },
  { id: "trends", label: "Trends", icon: TrendingUp },
  { id: "quotes", label: "Quotes", icon: Quote },
  { id: "validation", label: "Validation", icon: CheckCircle2 },
];

const CYAN = "#22d3ee";
const EMERALD = "#34d399";
const AMBER = "#fbbf24";
const ROSE = "#fb7185";
const SLATE = "#64748b";
const CHART_COLORS = [CYAN, EMERALD, "#818cf8", AMBER, ROSE, "#a78bfa", "#38bdf8", "#f472b6"];

function StatCard({ label, value, icon: Icon, accent = false }: { label: string; value: string | number; icon: any; accent?: boolean }) {
  return (
    <div className={`panel p-5 ${accent ? "glow-border" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
        <Icon className={`w-4 h-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <p className="stat-number text-2xl font-bold">{value}</p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="panel p-3 border border-border text-sm shadow-lg">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-medium">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { result, fileName, reset } = useAnalytics();
  const [, navigate] = useLocation();
  const params = useParams<{ tab?: string }>();
  const activeTab = params.tab || "summary";

  useEffect(() => {
    if (!result) navigate("/");
  }, [result, navigate]);

  if (!result) return null;

  const {
    themeSummary, themeSentiment, byInstitution, byProgram,
    trends, emergingThemes, quotes, validation, executiveSummary,
    totalComments, cleanedComments, noiseRatio, processingTime,
  } = result;

  return (
    <div className="min-h-screen bg-background grid-dots">
      {/* Top Command Bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => { reset(); navigate("/"); }}>
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="h-5 w-px bg-border" />
            <h1 className="text-sm font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
              IR Analytics Dashboard
            </h1>
            {fileName && (
              <span className="hidden md:inline text-xs text-muted-foreground font-mono bg-secondary px-2 py-0.5 rounded">
                {fileName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="hidden sm:flex items-center gap-1"><Clock className="w-3 h-3" /> {processingTime}s</span>
            <span className="hidden sm:flex items-center gap-1"><Hash className="w-3 h-3" /> {cleanedComments} comments</span>
            <span className="flex items-center gap-1"><Percent className="w-3 h-3" /> {(noiseRatio * 100).toFixed(1)}% noise</span>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="container py-6">
        <Tabs value={activeTab} onValueChange={(v) => navigate(`/dashboard/${v}`)}>
          <TabsList className="bg-secondary/50 border border-border mb-6 flex-wrap h-auto gap-1 p-1">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <t.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ---- SUMMARY ---- */}
          <TabsContent value="summary">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total Responses" value={totalComments.toLocaleString()} icon={FileText} accent />
              <StatCard label="Valid Comments" value={cleanedComments.toLocaleString()} icon={Hash} />
              <StatCard label="Themes Found" value={themeSummary.length} icon={BarChart3} accent />
              <StatCard label="Emerging Issues" value={emergingThemes.filter((e) => e.emerging).length} icon={AlertTriangle} />
            </div>
            <div className="panel p-6 glow-border">
              <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)" }}>Executive Summary</h2>
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-mono leading-relaxed">{executiveSummary}</pre>
            </div>
          </TabsContent>

          {/* ---- THEMES ---- */}
          <TabsContent value="themes">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 panel p-6">
                <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)" }}>Theme Frequency</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={[...themeSummary].sort((a, b) => a.count - b.count)} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                    <XAxis type="number" tick={{ fill: SLATE, fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={160} tick={{ fill: SLATE, fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Comments" fill={CYAN} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="panel p-6">
                <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)" }}>By Institution</h2>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {byInstitution.slice(0, 20).map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{r.topicName}</p>
                        <p className="text-xs text-muted-foreground">{r.group}</p>
                      </div>
                      <span className="stat-number text-sm font-semibold text-primary ml-3">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* By Program Level */}
            <div className="panel p-6 mt-6">
              <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)" }}>Themes by Program Level</h2>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={(() => {
                  const groups = ["Undergraduate", "Graduate", "Doctoral", "Certificate"];
                  return themeSummary.map((t) => {
                    const row: any = { name: t.name };
                    groups.forEach((g) => {
                      const match = byProgram.find((r) => r.topicName === t.name && r.group === g);
                      row[g] = match?.count || 0;
                    });
                    return row;
                  });
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                  <XAxis dataKey="name" tick={{ fill: SLATE, fontSize: 10 }} angle={-30} textAnchor="end" height={80} />
                  <YAxis tick={{ fill: SLATE, fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Undergraduate" fill={CYAN} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Graduate" fill={EMERALD} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Doctoral" fill={AMBER} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Certificate" fill={ROSE} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* ---- SENTIMENT ---- */}
          <TabsContent value="sentiment">
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <div className="panel p-6">
                <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)" }}>Average Sentiment by Theme</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={[...themeSentiment].sort((a, b) => a.avgCompound - b.avgCompound)} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                    <XAxis type="number" domain={[-0.5, 0.5]} tick={{ fill: SLATE, fontSize: 12 }} />
                    <YAxis type="category" dataKey="topicName" width={160} tick={{ fill: SLATE, fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="avgCompound" name="Avg Sentiment">
                      {themeSentiment.map((entry, i) => (
                        <Cell key={i} fill={entry.avgCompound > 0.05 ? EMERALD : entry.avgCompound < -0.05 ? ROSE : SLATE} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="panel p-6">
                <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)" }}>Sentiment Distribution</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={themeSentiment} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                    <XAxis type="number" tick={{ fill: SLATE, fontSize: 12 }} />
                    <YAxis type="category" dataKey="topicName" width={160} tick={{ fill: SLATE, fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="positivePct" name="Positive %" stackId="a" fill={EMERALD} />
                    <Bar dataKey="neutralPct" name="Neutral %" stackId="a" fill={SLATE} />
                    <Bar dataKey="negativePct" name="Negative %" stackId="a" fill={ROSE} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Sentiment table */}
            <div className="panel p-6">
              <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)" }}>Detailed Sentiment Data</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 font-medium text-muted-foreground">Theme</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Count</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Avg Score</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Positive</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Neutral</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Negative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {themeSentiment.map((s) => (
                      <tr key={s.topic} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 font-medium">{s.topicName}</td>
                        <td className="py-3 text-right font-mono">{s.count}</td>
                        <td className="py-3 text-right font-mono">
                          <span className={s.avgCompound > 0.05 ? "text-emerald-400" : s.avgCompound < -0.05 ? "text-rose-400" : "text-muted-foreground"}>
                            {s.avgCompound.toFixed(3)}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono text-emerald-400">{s.positivePct}%</td>
                        <td className="py-3 text-right font-mono text-muted-foreground">{s.neutralPct}%</td>
                        <td className="py-3 text-right font-mono text-rose-400">{s.negativePct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ---- TRENDS ---- */}
          <TabsContent value="trends">
            <div className="panel p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)" }}>Weekly Theme Frequency</h2>
              <ResponsiveContainer width="100%" height={450}>
                <LineChart data={(() => {
                  const weeks = Array.from(new Set(trends.map((t) => t.week))).sort();
                  return weeks.map((w) => {
                    const row: any = { week: w.slice(5) };
                    themeSummary.forEach((t) => {
                      const match = trends.find((tr) => tr.week === w && tr.topic === t.topic);
                      row[t.name] = match?.count || 0;
                    });
                    return row;
                  });
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                  <XAxis dataKey="week" tick={{ fill: SLATE, fontSize: 11 }} />
                  <YAxis tick={{ fill: SLATE, fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {themeSummary.map((t, i) => (
                    <Line key={t.topic} type="monotone" dataKey={t.name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Emerging Themes */}
            <div className="panel p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Emerging Themes
              </h2>
              {emergingThemes.filter((e) => e.emerging).length === 0 ? (
                <p className="text-muted-foreground text-sm">No emerging themes detected in the current dataset.</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {emergingThemes.filter((e) => e.emerging).map((e) => (
                    <div key={e.topic} className="panel p-4 glow-border">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm">{e.topicName}</h3>
                        <span className="flex items-center gap-1 text-xs font-mono text-amber-400">
                          <ArrowUpRight className="w-3 h-3" />
                          {e.growthRate}x
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Prev: {e.previousCount}</span>
                        <span>Latest: {e.latestCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ---- QUOTES ---- */}
          <TabsContent value="quotes">
            <div className="space-y-6">
              {themeSummary.map((t) => {
                const topicQuotes = quotes.filter((q) => q.topic === t.topic);
                if (topicQuotes.length === 0) return null;
                return (
                  <div key={t.topic} className="panel p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
                      <Quote className="w-5 h-5 text-primary" />
                      {t.name}
                    </h2>
                    <div className="space-y-3">
                      {topicQuotes.map((q, i) => (
                        <div key={i} className="flex gap-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
                          <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-mono text-primary">
                            {(q.similarity * 100).toFixed(0)}%
                          </div>
                          <blockquote className="text-sm text-muted-foreground leading-relaxed italic">
                            "{q.quote}"
                          </blockquote>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ---- VALIDATION ---- */}
          <TabsContent value="validation">
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <div className="panel p-6">
                <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)" }}>Topic Coherence Scores</h2>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={validation.filter((v) => v.topic >= 0).sort((a, b) => (a.coherence || 0) - (b.coherence || 0))} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                    <XAxis type="number" domain={[0, 1]} tick={{ fill: SLATE, fontSize: 12 }} />
                    <YAxis type="category" dataKey="topicName" width={160} tick={{ fill: SLATE, fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="coherence" name="Coherence">
                      {validation.filter((v) => v.topic >= 0).map((entry, i) => (
                        <Cell key={i} fill={(entry.coherence || 0) > 0.6 ? EMERALD : (entry.coherence || 0) > 0.4 ? AMBER : ROSE} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="panel p-6">
                <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)" }}>Topic Size Distribution</h2>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie data={validation.filter((v) => v.topic >= 0)} dataKey="size" nameKey="topicName" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name.slice(0, 14)}${name.length > 14 ? '…' : ''} ${(percent * 100).toFixed(0)}%`} labelLine={true} fontSize={11}>
                      {validation.filter((v) => v.topic >= 0).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Validation table */}
            <div className="panel p-6">
              <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)" }}>Validation Report</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 font-medium text-muted-foreground">Topic</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Size</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">%</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Coherence</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validation.map((v) => (
                      <tr key={v.topic} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 font-medium">{v.topicName}</td>
                        <td className="py-3 text-right font-mono">{v.size}</td>
                        <td className="py-3 text-right font-mono">{v.percentage}%</td>
                        <td className="py-3 text-right font-mono">{v.coherence !== null ? v.coherence.toFixed(4) : "—"}</td>
                        <td className="py-3 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            v.qualityFlag === "OK" ? "bg-emerald-500/10 text-emerald-400" :
                            v.qualityFlag === "Noise" ? "bg-slate-500/10 text-slate-400" :
                            "bg-amber-500/10 text-amber-400"
                          }`}>
                            {v.qualityFlag}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-secondary/30 border border-border/50 text-sm text-muted-foreground">
                <strong>Noise Ratio:</strong> <span className="font-mono">{(noiseRatio * 100).toFixed(1)}%</span> of comments were not assigned to any topic.
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
