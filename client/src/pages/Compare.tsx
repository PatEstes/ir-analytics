import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation, useSearch } from "wouter";
import { useMemo } from "react";
import { Loader2, GitCompare, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { AnalysisResult } from "@/contexts/AnalyticsContext";

const COLORS = [
  "oklch(0.72 0.15 195)",
  "oklch(0.70 0.18 160)",
  "oklch(0.75 0.15 80)",
  "oklch(0.65 0.15 300)",
];

export default function Compare() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const idsParam = params.get("ids") || "";
  const ids = useMemo(() => idsParam.split(",").map(Number).filter(Boolean), [idsParam]);

  const { data: analyses, isLoading } = trpc.analysis.compare.useQuery(
    { ids },
    { enabled: !!user && ids.length >= 2 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analyses || analyses.length < 2) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <GitCompare className="w-16 h-16 text-primary/40 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Select Analyses to Compare</h2>
          <p className="text-muted-foreground mb-4">Go to the Library and select 2-4 analyses.</p>
          <Button onClick={() => navigate("/library")}>
            Go to Library
          </Button>
        </div>
      </div>
    );
  }

  // Build comparison data
  const topicComparisonData = buildTopicComparison(analyses);
  const sentimentComparisonData = buildSentimentComparison(analyses);
  const overviewData = buildOverview(analyses);
  const radarData = buildRadarData(analyses);

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b border-border bg-card/30">
        <div className="container flex items-center justify-between h-14">
          <h1 className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
            <GitCompare className="w-4 h-4 text-primary" />
            Semester Comparison
          </h1>
          <div className="flex items-center gap-2">
            {analyses.map((a, i) => (
              <Badge key={a.id} variant="outline" className="text-xs" style={{ borderColor: COLORS[i] }}>
                <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: COLORS[i] }} />
                {a.semester || a.title}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {/* Overview Cards */}
        <section>
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-heading)" }}>
            Overview Comparison
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {overviewData.map((metric) => (
              <div key={metric.label} className="panel p-4">
                <p className="text-xs text-muted-foreground mb-2">{metric.label}</p>
                <div className="space-y-2">
                  {metric.values.map((v, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: COLORS[i] }}>
                        {analyses[i].semester || analyses[i].title}
                      </span>
                      <span className="stat-number text-sm font-bold" style={{ color: COLORS[i] }}>
                        {v}
                      </span>
                    </div>
                  ))}
                  {metric.values.length === 2 && (
                    <div className="flex items-center justify-end gap-1 text-xs pt-1 border-t border-border">
                      {metric.change > 0 ? (
                        <TrendingUp className="w-3 h-3 text-green-400" />
                      ) : metric.change < 0 ? (
                        <TrendingDown className="w-3 h-3 text-red-400" />
                      ) : (
                        <Minus className="w-3 h-3 text-muted-foreground" />
                      )}
                      <span className={metric.change > 0 ? "text-green-400" : metric.change < 0 ? "text-red-400" : "text-muted-foreground"}>
                        {metric.change > 0 ? "+" : ""}{metric.change}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Topic Distribution Comparison */}
        <section className="panel p-6">
          <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--font-heading)" }}>
            Topic Distribution Comparison
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topicComparisonData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" />
              <XAxis type="number" stroke="oklch(0.60 0.02 250)" fontSize={11} />
              <YAxis dataKey="topic" type="category" width={140} stroke="oklch(0.60 0.02 250)" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: "oklch(0.16 0.02 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px" }}
                labelStyle={{ color: "oklch(0.88 0.01 250)" }}
              />
              <Legend />
              {analyses.map((a, i) => (
                <Bar
                  key={a.id}
                  dataKey={a.semester || a.title}
                  fill={COLORS[i]}
                  radius={[0, 4, 4, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* Sentiment Comparison */}
        <section className="panel p-6">
          <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--font-heading)" }}>
            Sentiment Score Comparison
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={sentimentComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 250)" />
              <XAxis dataKey="topic" stroke="oklch(0.60 0.02 250)" fontSize={10} angle={-30} textAnchor="end" height={80} />
              <YAxis stroke="oklch(0.60 0.02 250)" fontSize={11} domain={[-1, 1]} />
              <Tooltip
                contentStyle={{ backgroundColor: "oklch(0.16 0.02 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px" }}
                labelStyle={{ color: "oklch(0.88 0.01 250)" }}
              />
              <Legend />
              {analyses.map((a, i) => (
                <Bar
                  key={a.id}
                  dataKey={a.semester || a.title}
                  fill={COLORS[i]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* Radar Comparison */}
        {radarData.length > 0 && (
          <section className="panel p-6">
            <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--font-heading)" }}>
              Topic Strength Radar
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="oklch(0.25 0.02 250)" />
                <PolarAngleAxis dataKey="topic" stroke="oklch(0.60 0.02 250)" fontSize={10} />
                <PolarRadiusAxis stroke="oklch(0.40 0.02 250)" fontSize={9} />
                {analyses.map((a, i) => (
                  <Radar
                    key={a.id}
                    name={a.semester || a.title}
                    dataKey={a.semester || a.title}
                    stroke={COLORS[i]}
                    fill={COLORS[i]}
                    fillOpacity={0.15}
                  />
                ))}
                <Legend />
                <Tooltip
                  contentStyle={{ backgroundColor: "oklch(0.16 0.02 250)", border: "1px solid oklch(0.25 0.02 250)", borderRadius: "8px" }}
                  labelStyle={{ color: "oklch(0.88 0.01 250)" }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </section>
        )}
      </div>
    </div>
  );
}

// ─── Helper Functions ─────────────────────────────────────────

type AnalysisRow = { id: number; title: string; semester: string | null; resultsJson: unknown; totalResponses: number; cleanedComments: number; topicCount: number; noiseRatio: string | null };

function getResults(a: AnalysisRow): AnalysisResult | null {
  return a.resultsJson as AnalysisResult | null;
}

function buildTopicComparison(analyses: AnalysisRow[]) {
  const allTopics = new Set<string>();
  analyses.forEach(a => {
    const r = getResults(a);
    r?.themeSummary.forEach(t => allTopics.add(t.name));
  });

  return Array.from(allTopics).map(topic => {
    const row: Record<string, string | number> = { topic };
    analyses.forEach(a => {
      const r = getResults(a);
      const t = r?.themeSummary.find(ts => ts.name === topic);
      row[a.semester || a.title] = t?.count || 0;
    });
    return row;
  });
}

function buildSentimentComparison(analyses: AnalysisRow[]) {
  const allTopics = new Set<string>();
  analyses.forEach(a => {
    const r = getResults(a);
    r?.themeSentiment.forEach(t => allTopics.add(t.topicName));
  });

  return Array.from(allTopics).map(topic => {
    const row: Record<string, string | number> = { topic };
    analyses.forEach(a => {
      const r = getResults(a);
      const t = r?.themeSentiment.find(ts => ts.topicName === topic);
      row[a.semester || a.title] = t?.avgCompound || 0;
    });
    return row;
  });
}

function buildOverview(analyses: AnalysisRow[]) {
  const metrics = [
    {
      label: "Total Responses",
      values: analyses.map(a => a.totalResponses.toLocaleString()),
      change: analyses.length === 2
        ? Math.round(((analyses[1].totalResponses - analyses[0].totalResponses) / analyses[0].totalResponses) * 100)
        : 0,
    },
    {
      label: "Cleaned Comments",
      values: analyses.map(a => a.cleanedComments.toLocaleString()),
      change: analyses.length === 2
        ? Math.round(((analyses[1].cleanedComments - analyses[0].cleanedComments) / analyses[0].cleanedComments) * 100)
        : 0,
    },
    {
      label: "Topics Discovered",
      values: analyses.map(a => String(a.topicCount)),
      change: analyses.length === 2
        ? Math.round(((analyses[1].topicCount - analyses[0].topicCount) / Math.max(1, analyses[0].topicCount)) * 100)
        : 0,
    },
    {
      label: "Noise Ratio",
      values: analyses.map(a => a.noiseRatio || "N/A"),
      change: 0,
    },
  ];
  return metrics;
}

function buildRadarData(analyses: AnalysisRow[]) {
  const allTopics = new Set<string>();
  analyses.forEach(a => {
    const r = getResults(a);
    r?.themeSummary.forEach(t => allTopics.add(t.name));
  });

  return Array.from(allTopics).map(topic => {
    const row: Record<string, string | number> = { topic };
    analyses.forEach(a => {
      const r = getResults(a);
      const t = r?.themeSummary.find(ts => ts.name === topic);
      // Normalize to percentage of total
      const total = r?.cleanedComments || 1;
      row[a.semester || a.title] = t ? Math.round((t.count / total) * 100) : 0;
    });
    return row;
  });
}
