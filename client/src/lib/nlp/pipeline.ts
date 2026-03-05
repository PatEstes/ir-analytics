/**
 * pipeline.ts — Main NLP pipeline orchestrator
 * Ties together CSV parsing, embeddings, sentiment, clustering, and quote extraction
 * into a single analysis flow. 100% client-side, no data leaves the browser.
 */

import type { RawComment, ColumnMapping } from "./csvParser";
import { parseCSV } from "./csvParser";
import { initEmbeddingModel, generateEmbeddings, embedText } from "./embeddings";
import { batchAnalyzeSentiment, type SentimentScore } from "./sentiment";
import { clusterEmbeddings, labelClusters, findRepresentativeQuotes, SEED_TOPICS } from "./clustering";
import { cosineSimilarity } from "./embeddings";

/** Progress callback for the pipeline */
export interface PipelineProgress {
  step: string;
  stepNumber: number;
  totalSteps: number;
  percent: number;
  detail?: string;
}

/** The full analysis result that matches the existing AnalysisResult interface */
export interface PipelineResult {
  topics: {
    name: string;
    count: number;
    percentage: number;
    representativeQuotes: string[];
  }[];
  sentimentOverview: {
    positive: number;
    negative: number;
    neutral: number;
    averageCompound: number;
  };
  sentimentByTopic: {
    topic: string;
    positive: number;
    negative: number;
    neutral: number;
    avgCompound: number;
  }[];
  weeklyTrends: {
    week: string;
    topics: Record<string, number>;
  }[];
  emergingThemes: {
    theme: string;
    trend: "rising" | "stable" | "declining";
    recentCount: number;
    previousCount: number;
  }[];
  comments: {
    id: string;
    text: string;
    topic: string;
    sentiment: SentimentScore["label"];
    compound: number;
    institution: string;
    school: string;
    programLevel: string;
    date: string;
  }[];
  validation: {
    topicCoherence: number;
    avgClusterSize: number;
    noiseRatio: number;
    topicSizeDistribution: { topic: string; size: number }[];
  };
  executiveSummary: string;
  totalComments: number;
  analyzedComments: number;
  fileName: string;
  analysisDate: string;
  stratified: {
    byInstitution: Record<string, Record<string, number>>;
    byProgram: Record<string, Record<string, number>>;
    bySchool: Record<string, Record<string, number>>;
  };
}

const TOTAL_STEPS = 7;

/**
 * Run the complete NLP analysis pipeline on a CSV file.
 */
export async function runPipeline(
  file: File,
  columnMapping?: Partial<ColumnMapping>,
  onProgress?: (progress: PipelineProgress) => void
): Promise<PipelineResult> {
  const report = (step: string, stepNumber: number, percent: number, detail?: string) => {
    onProgress?.({ step, stepNumber, totalSteps: TOTAL_STEPS, percent, detail });
  };

  // ── Step 1: Parse CSV ──
  report("Parsing CSV file", 1, 5, "Reading and validating columns...");
  const { comments: rawComments, totalRows, skippedRows } = await parseCSV(file, columnMapping);

  if (rawComments.length === 0) {
    throw new Error("No valid comments found in the CSV file. Ensure there is a text column with comments of at least 10 characters.");
  }

  report("Parsing CSV file", 1, 10, `Found ${rawComments.length} comments (${skippedRows} skipped)`);
  const texts = rawComments.map((c) => c.commentText);

  // ── Step 2: Load embedding model ──
  report("Loading AI model", 2, 12, "Downloading embedding model (first time only, ~22MB)...");
  await initEmbeddingModel((info) => {
    if (info.progress !== undefined) {
      report("Loading AI model", 2, 12 + Math.floor(info.progress * 0.13), info.status);
    }
  });

  // ── Step 3: Generate embeddings ──
  report("Generating embeddings", 3, 25, "Converting comments to semantic vectors...");
  const embeddings = await generateEmbeddings(texts, (completed, total) => {
    const pct = 25 + Math.floor((completed / total) * 25);
    report("Generating embeddings", 3, pct, `${completed}/${total} comments embedded`);
  });

  // ── Step 4: Sentiment analysis ──
  report("Analyzing sentiment", 4, 50, "Running VADER sentiment analysis...");
  const sentiments = await batchAnalyzeSentiment(texts, (completed, total) => {
    const pct = 50 + Math.floor((completed / total) * 10);
    report("Analyzing sentiment", 4, pct, `${completed}/${total} comments scored`);
  });

  // ── Step 5: Cluster into topics ──
  report("Discovering topics", 5, 60, "Clustering comments by semantic similarity...");
  const clusterResult = clusterEmbeddings(embeddings);

  report("Discovering topics", 5, 65, "Labeling clusters with seed topics...");
  const topicLabels = await labelClusters(clusterResult.centroids, embedText);

  report("Discovering topics", 5, 70, "Finding representative quotes...");
  const repQuotes = findRepresentativeQuotes(
    embeddings,
    clusterResult.assignments,
    clusterResult.centroids,
    texts,
    3
  );

  // ── Step 6: Build structured results ──
  report("Building results", 6, 75, "Aggregating topics, sentiment, and trends...");

  // Build enriched comments
  const enrichedComments = rawComments.map((raw, i) => ({
    id: raw.responseId,
    text: raw.commentText,
    topic: topicLabels[clusterResult.assignments[i]] || "Uncategorized",
    sentiment: sentiments[i].label,
    compound: sentiments[i].compound,
    institution: raw.institution,
    school: raw.school,
    programLevel: raw.programLevel,
    date: raw.surveyDate,
  }));

  // Topic aggregation
  const topicCounts = new Map<string, number>();
  const topicSentiments = new Map<string, { pos: number; neg: number; neu: number; compounds: number[] }>();

  for (const comment of enrichedComments) {
    topicCounts.set(comment.topic, (topicCounts.get(comment.topic) || 0) + 1);
    if (!topicSentiments.has(comment.topic)) {
      topicSentiments.set(comment.topic, { pos: 0, neg: 0, neu: 0, compounds: [] });
    }
    const ts = topicSentiments.get(comment.topic)!;
    if (comment.sentiment === "Positive") ts.pos++;
    else if (comment.sentiment === "Negative") ts.neg++;
    else ts.neu++;
    ts.compounds.push(comment.compound);
  }

  const totalAnalyzed = enrichedComments.length;

  const topics = Array.from(topicCounts.entries()).map(([name, count]) => {
    const quotes = repQuotes.get(
      topicLabels.indexOf(name)
    );
    return {
      name,
      count,
      percentage: Math.round((count / totalAnalyzed) * 100),
      representativeQuotes: quotes?.map((q) => q.text) || [],
    };
  }).sort((a, b) => b.count - a.count);

  // Sentiment overview
  const posCount = sentiments.filter((s) => s.label === "Positive").length;
  const negCount = sentiments.filter((s) => s.label === "Negative").length;
  const neuCount = sentiments.filter((s) => s.label === "Neutral").length;
  const avgCompound = sentiments.reduce((sum, s) => sum + s.compound, 0) / sentiments.length;

  const sentimentOverview = {
    positive: Math.round((posCount / totalAnalyzed) * 100),
    negative: Math.round((negCount / totalAnalyzed) * 100),
    neutral: Math.round((neuCount / totalAnalyzed) * 100),
    averageCompound: Math.round(avgCompound * 1000) / 1000,
  };

  // Sentiment by topic
  const sentimentByTopic = Array.from(topicSentiments.entries()).map(([topic, data]) => {
    const total = data.pos + data.neg + data.neu;
    return {
      topic,
      positive: Math.round((data.pos / total) * 100),
      negative: Math.round((data.neg / total) * 100),
      neutral: Math.round((data.neu / total) * 100),
      avgCompound: Math.round((data.compounds.reduce((a, b) => a + b, 0) / data.compounds.length) * 1000) / 1000,
    };
  });

  // Weekly trends
  report("Building results", 6, 80, "Computing weekly trends...");
  const weeklyTrends = computeWeeklyTrends(enrichedComments);
  const emergingThemes = detectEmergingThemes(weeklyTrends, topicLabels);

  // Validation metrics
  report("Building results", 6, 85, "Computing validation metrics...");
  const validation = computeValidation(embeddings, clusterResult, topicLabels, totalAnalyzed);

  // Stratified data
  report("Building results", 6, 88, "Computing stratified breakdowns...");
  const stratified = computeStratified(enrichedComments);

  // ── Step 7: Executive summary ──
  report("Generating summary", 7, 90, "Writing executive summary...");
  const executiveSummary = generateExecutiveSummary(
    topics,
    sentimentOverview,
    emergingThemes,
    totalAnalyzed,
    file.name
  );

  report("Complete", 7, 100, "Analysis complete!");

  return {
    topics,
    sentimentOverview,
    sentimentByTopic,
    weeklyTrends,
    emergingThemes,
    comments: enrichedComments,
    validation,
    executiveSummary,
    totalComments: totalRows,
    analyzedComments: totalAnalyzed,
    fileName: file.name,
    analysisDate: new Date().toISOString(),
    stratified,
  };
}

// ── Helper functions ──

function computeWeeklyTrends(
  comments: { topic: string; date: string }[]
): { week: string; topics: Record<string, number> }[] {
  const weekMap = new Map<string, Record<string, number>>();

  for (const comment of comments) {
    let week = "Unknown";
    if (comment.date) {
      try {
        const d = new Date(comment.date);
        if (!isNaN(d.getTime())) {
          // Get ISO week start (Monday)
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(d.setDate(diff));
          week = monday.toISOString().split("T")[0];
        }
      } catch {
        week = "Unknown";
      }
    }

    if (!weekMap.has(week)) {
      weekMap.set(week, {});
    }
    const topics = weekMap.get(week)!;
    topics[comment.topic] = (topics[comment.topic] || 0) + 1;
  }

  return Array.from(weekMap.entries())
    .filter(([w]) => w !== "Unknown")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, topics]) => ({ week, topics }));
}

function detectEmergingThemes(
  weeklyTrends: { week: string; topics: Record<string, number> }[],
  topicLabels: string[]
): { theme: string; trend: "rising" | "stable" | "declining"; recentCount: number; previousCount: number }[] {
  if (weeklyTrends.length < 2) {
    return topicLabels.map((t) => ({ theme: t, trend: "stable" as const, recentCount: 0, previousCount: 0 }));
  }

  const midpoint = Math.floor(weeklyTrends.length / 2);
  const earlier = weeklyTrends.slice(0, midpoint);
  const later = weeklyTrends.slice(midpoint);

  return topicLabels.map((theme) => {
    const previousCount = earlier.reduce((sum, w) => sum + (w.topics[theme] || 0), 0);
    const recentCount = later.reduce((sum, w) => sum + (w.topics[theme] || 0), 0);

    const prevRate = previousCount / Math.max(earlier.length, 1);
    const recentRate = recentCount / Math.max(later.length, 1);

    let trend: "rising" | "stable" | "declining" = "stable";
    if (recentRate > prevRate * 1.3) trend = "rising";
    else if (recentRate < prevRate * 0.7) trend = "declining";

    return { theme, trend, recentCount, previousCount };
  });
}

function computeValidation(
  embeddings: number[][],
  clusterResult: { assignments: number[]; centroids: number[][]; noiseIndices: number[] },
  topicLabels: string[],
  totalAnalyzed: number
): {
  topicCoherence: number;
  avgClusterSize: number;
  noiseRatio: number;
  topicSizeDistribution: { topic: string; size: number }[];
} {
  // Compute average intra-cluster cosine similarity as coherence proxy
  const clusterSims: number[] = [];
  const clusterSizes = new Map<number, number>();

  for (let i = 0; i < embeddings.length; i++) {
    const cluster = clusterResult.assignments[i];
    clusterSizes.set(cluster, (clusterSizes.get(cluster) || 0) + 1);
    const sim = cosineSimilarity(embeddings[i], clusterResult.centroids[cluster]);
    clusterSims.push(sim);
  }

  const topicCoherence = Math.round(
    (clusterSims.reduce((a, b) => a + b, 0) / clusterSims.length) * 100
  ) / 100;

  const avgClusterSize = Math.round(totalAnalyzed / clusterResult.centroids.length);
  const noiseRatio = Math.round((clusterResult.noiseIndices.length / totalAnalyzed) * 100) / 100;

  const topicSizeDistribution = topicLabels.map((topic, idx) => ({
    topic,
    size: clusterSizes.get(idx) || 0,
  }));

  return { topicCoherence, avgClusterSize, noiseRatio, topicSizeDistribution };
}

function computeStratified(
  comments: { topic: string; institution: string; school: string; programLevel: string }[]
): {
  byInstitution: Record<string, Record<string, number>>;
  byProgram: Record<string, Record<string, number>>;
  bySchool: Record<string, Record<string, number>>;
} {
  const byInstitution: Record<string, Record<string, number>> = {};
  const byProgram: Record<string, Record<string, number>> = {};
  const bySchool: Record<string, Record<string, number>> = {};

  for (const c of comments) {
    // By institution
    if (!byInstitution[c.institution]) byInstitution[c.institution] = {};
    byInstitution[c.institution][c.topic] = (byInstitution[c.institution][c.topic] || 0) + 1;

    // By program level
    if (!byProgram[c.programLevel]) byProgram[c.programLevel] = {};
    byProgram[c.programLevel][c.topic] = (byProgram[c.programLevel][c.topic] || 0) + 1;

    // By school
    if (!bySchool[c.school]) bySchool[c.school] = {};
    bySchool[c.school][c.topic] = (bySchool[c.school][c.topic] || 0) + 1;
  }

  return { byInstitution, byProgram, bySchool };
}

function generateExecutiveSummary(
  topics: { name: string; count: number; percentage: number }[],
  sentiment: { positive: number; negative: number; neutral: number; averageCompound: number },
  emerging: { theme: string; trend: string }[],
  totalAnalyzed: number,
  fileName: string
): string {
  const topTopic = topics[0];
  const risingThemes = emerging.filter((e) => e.trend === "rising");
  const decliningThemes = emerging.filter((e) => e.trend === "declining");

  let summary = `Analysis of ${totalAnalyzed} comments from "${fileName}" identified ${topics.length} distinct themes. `;
  summary += `The most prevalent theme is "${topTopic.name}" (${topTopic.percentage}% of comments). `;
  summary += `Overall sentiment is ${sentiment.averageCompound > 0.05 ? "positive" : sentiment.averageCompound < -0.05 ? "negative" : "mixed"} `;
  summary += `with ${sentiment.positive}% positive, ${sentiment.negative}% negative, and ${sentiment.neutral}% neutral responses. `;

  if (risingThemes.length > 0) {
    summary += `Emerging concerns include ${risingThemes.map((t) => `"${t.theme}"`).join(", ")}. `;
  }
  if (decliningThemes.length > 0) {
    summary += `Declining themes include ${decliningThemes.map((t) => `"${t.theme}"`).join(", ")}. `;
  }

  summary += `All processing was performed locally in the browser — no data was transmitted to external servers.`;

  return summary;
}
