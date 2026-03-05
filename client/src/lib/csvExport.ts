/*
 * csvExport.ts — CSV Export Utility
 * Converts dashboard data arrays into downloadable CSV files.
 * Handles escaping, BOM for Excel compatibility, and filtered data context.
 */

import type {
  ThemeSummary,
  ThemeSentiment,
  StratifiedRow,
  TrendRow,
  EmergingTheme,
  Quote,
  ValidationRow,
} from "@/contexts/AnalyticsContext";

// ─── Core helpers ───────────────────────────────────────────────

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = rows.map((row) => row.map(escapeCSV).join(","));
  return [headerLine, ...dataLines].join("\r\n");
}

function downloadCSV(csv: string, filename: string): void {
  // BOM for Excel UTF-8 compatibility
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function timestamp(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Export functions per tab ───────────────────────────────────

export function exportSummary(
  executiveSummary: string,
  totalComments: number,
  cleanedComments: number,
  filteredComments: number,
  themeCount: number,
  noiseRatio: number,
  isFiltered: boolean,
): void {
  const headers = ["Metric", "Value"];
  const rows: (string | number)[][] = [
    ["Total Responses", totalComments],
    [isFiltered ? "Filtered Comments" : "Valid Comments", isFiltered ? filteredComments : cleanedComments],
    ["Themes", themeCount],
    ["Noise Ratio", `${(noiseRatio * 100).toFixed(1)}%`],
    ["", ""],
    ["Executive Summary", ""],
    ...executiveSummary.split("\n").map((line) => ["", line]),
  ];
  downloadCSV(toCSV(headers, rows), `ir-analytics-summary-${timestamp()}.csv`);
}

export function exportThemes(
  themeSummary: ThemeSummary[],
  byInstitution: StratifiedRow[],
  byProgram: StratifiedRow[],
  bySchool: StratifiedRow[],
): void {
  // Sheet 1: Theme overview
  const headers = [
    "Theme", "Topic ID", "Comment Count", "Keywords",
  ];
  const rows = themeSummary.map((t) => [
    t.name, t.topic, t.count, t.keywords.join("; "),
  ]);

  // Sheet 2: By Institution (appended after a blank row)
  const instHeaders = ["Theme", "Institution", "Count"];
  const instRows = byInstitution.map((r) => [r.topicName, r.group, r.count]);

  // Sheet 3: By Program Level
  const progHeaders = ["Theme", "Program Level", "Count"];
  const progRows = byProgram.map((r) => [r.topicName, r.group, r.count]);

  // Sheet 4: By School
  const schoolHeaders = ["Theme", "School", "Count"];
  const schoolRows = bySchool.map((r) => [r.topicName, r.group, r.count]);

  let csv = toCSV(headers, rows);
  csv += "\r\n\r\n--- By Institution ---\r\n";
  csv += toCSV(instHeaders, instRows);
  csv += "\r\n\r\n--- By Program Level ---\r\n";
  csv += toCSV(progHeaders, progRows);
  if (bySchool.length > 0) {
    csv += "\r\n\r\n--- By School ---\r\n";
    csv += toCSV(schoolHeaders, schoolRows);
  }

  downloadCSV(csv, `ir-analytics-themes-${timestamp()}.csv`);
}

export function exportSentiment(themeSentiment: ThemeSentiment[]): void {
  const headers = [
    "Theme", "Topic ID", "Comment Count",
    "Avg Compound Score", "Positive %", "Neutral %", "Negative %",
  ];
  const rows = themeSentiment.map((s) => [
    s.topicName, s.topic, s.count,
    s.avgCompound.toFixed(4), s.positivePct, s.neutralPct, s.negativePct,
  ]);
  downloadCSV(toCSV(headers, rows), `ir-analytics-sentiment-${timestamp()}.csv`);
}

export function exportTrends(
  trends: TrendRow[],
  emergingThemes: EmergingTheme[],
  themeSummary: ThemeSummary[],
): void {
  // Weekly frequency pivot table
  const weeks = Array.from(new Set(trends.map((t) => t.week))).sort();
  const themeNames = themeSummary.map((t) => t.name);
  const headers = ["Week", ...themeNames];
  const rows = weeks.map((w) => {
    const row: (string | number)[] = [w];
    themeSummary.forEach((t) => {
      const match = trends.find((tr) => tr.week === w && tr.topic === t.topic);
      row.push(match?.count || 0);
    });
    return row;
  });

  let csv = toCSV(headers, rows);

  // Emerging themes section
  const emerging = emergingThemes.filter((e) => e.emerging);
  if (emerging.length > 0) {
    csv += "\r\n\r\n--- Emerging Themes ---\r\n";
    const eHeaders = ["Theme", "Growth Rate", "Previous Count", "Latest Count"];
    const eRows = emerging.map((e) => [e.topicName, `${e.growthRate}x`, e.previousCount, e.latestCount]);
    csv += toCSV(eHeaders, eRows);
  }

  downloadCSV(csv, `ir-analytics-trends-${timestamp()}.csv`);
}

export function exportQuotes(quotes: Quote[], themeSummary: ThemeSummary[]): void {
  const headers = ["Theme", "Quote", "Similarity Score"];
  const rows: (string | number)[] [] = [];
  themeSummary.forEach((t) => {
    const topicQuotes = quotes.filter((q) => q.topic === t.topic);
    topicQuotes.forEach((q) => {
      rows.push([t.name, q.quote, (q.similarity * 100).toFixed(1) + "%"]);
    });
  });
  downloadCSV(toCSV(headers, rows), `ir-analytics-quotes-${timestamp()}.csv`);
}

export function exportValidation(validation: ValidationRow[], noiseRatio: number): void {
  const headers = [
    "Topic", "Topic ID", "Size", "Percentage", "Coherence Score", "Quality Flag",
  ];
  const rows = validation.map((v) => [
    v.topicName, v.topic, v.size, `${v.percentage}%`,
    v.coherence !== null ? v.coherence.toFixed(4) : "N/A", v.qualityFlag,
  ]);
  rows.push(["", "", "", "", "", ""]);
  rows.push(["Overall Noise Ratio", "", "", `${(noiseRatio * 100).toFixed(1)}%`, "", ""]);
  downloadCSV(toCSV(headers, rows), `ir-analytics-validation-${timestamp()}.csv`);
}

export function exportAll(
  executiveSummary: string,
  totalComments: number,
  cleanedComments: number,
  filteredComments: number,
  noiseRatio: number,
  isFiltered: boolean,
  themeSummary: ThemeSummary[],
  themeSentiment: ThemeSentiment[],
  byInstitution: StratifiedRow[],
  byProgram: StratifiedRow[],
  bySchool: StratifiedRow[],
  trends: TrendRow[],
  emergingThemes: EmergingTheme[],
  quotes: Quote[],
  validation: ValidationRow[],
): void {
  let csv = "";

  // Section 1: Summary
  csv += "=== EXECUTIVE SUMMARY ===\r\n";
  csv += toCSV(["Metric", "Value"], [
    ["Total Responses", totalComments],
    [isFiltered ? "Filtered Comments" : "Valid Comments", isFiltered ? filteredComments : cleanedComments],
    ["Themes", themeSummary.length],
    ["Noise Ratio", `${(noiseRatio * 100).toFixed(1)}%`],
  ]);
  csv += "\r\n\r\n";
  csv += executiveSummary.split("\n").map((l) => escapeCSV(l)).join("\r\n");
  csv += "\r\n\r\n";

  // Section 2: Themes
  csv += "=== THEME DISTRIBUTION ===\r\n";
  csv += toCSV(
    ["Theme", "Topic ID", "Count", "Keywords"],
    themeSummary.map((t) => [t.name, t.topic, t.count, t.keywords.join("; ")]),
  );
  csv += "\r\n\r\n";

  // Section 3: Sentiment
  csv += "=== SENTIMENT ANALYSIS ===\r\n";
  csv += toCSV(
    ["Theme", "Count", "Avg Score", "Positive %", "Neutral %", "Negative %"],
    themeSentiment.map((s) => [s.topicName, s.count, s.avgCompound.toFixed(4), s.positivePct, s.neutralPct, s.negativePct]),
  );
  csv += "\r\n\r\n";

  // Section 4: By Institution
  csv += "=== BY INSTITUTION ===\r\n";
  csv += toCSV(
    ["Theme", "Institution", "Count"],
    byInstitution.map((r) => [r.topicName, r.group, r.count]),
  );
  csv += "\r\n\r\n";

  // Section 5: By Program Level
  csv += "=== BY PROGRAM LEVEL ===\r\n";
  csv += toCSV(
    ["Theme", "Program Level", "Count"],
    byProgram.map((r) => [r.topicName, r.group, r.count]),
  );
  csv += "\r\n\r\n";

  // Section 6: By School
  if (bySchool.length > 0) {
    csv += "=== BY SCHOOL ===\r\n";
    csv += toCSV(
      ["Theme", "School", "Count"],
      bySchool.map((r) => [r.topicName, r.group, r.count]),
    );
    csv += "\r\n\r\n";
  }

  // Section 7: Trends
  csv += "=== WEEKLY TRENDS ===\r\n";
  const weeks = Array.from(new Set(trends.map((t) => t.week))).sort();
  const themeNames = themeSummary.map((t) => t.name);
  csv += toCSV(
    ["Week", ...themeNames],
    weeks.map((w) => {
      const row: (string | number)[] = [w];
      themeSummary.forEach((t) => {
        const match = trends.find((tr) => tr.week === w && tr.topic === t.topic);
        row.push(match?.count || 0);
      });
      return row;
    }),
  );
  csv += "\r\n\r\n";

  // Section 8: Quotes
  csv += "=== REPRESENTATIVE QUOTES ===\r\n";
  const quoteRows: (string | number)[][] = [];
  themeSummary.forEach((t) => {
    quotes.filter((q) => q.topic === t.topic).forEach((q) => {
      quoteRows.push([t.name, q.quote, `${(q.similarity * 100).toFixed(1)}%`]);
    });
  });
  csv += toCSV(["Theme", "Quote", "Similarity"], quoteRows);
  csv += "\r\n\r\n";

  // Section 9: Validation
  csv += "=== VALIDATION REPORT ===\r\n";
  csv += toCSV(
    ["Topic", "Size", "Percentage", "Coherence", "Quality Flag"],
    validation.map((v) => [v.topicName, v.size, `${v.percentage}%`, v.coherence !== null ? v.coherence.toFixed(4) : "N/A", v.qualityFlag]),
  );

  downloadCSV(csv, `ir-analytics-full-report-${timestamp()}.csv`);
}
