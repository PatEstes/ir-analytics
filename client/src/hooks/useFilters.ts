/*
 * useFilters.ts — Observatory Design
 * Centralized filter hook that takes raw AnalysisResult data
 * and returns filtered versions of every dataset.
 */

import { useState, useMemo } from "react";
import type { FilterState } from "@/components/FilterBar";
import type {
  AnalysisResult,
  ThemeSummary,
  ThemeSentiment,
  StratifiedRow,
  TrendRow,
  EmergingTheme,
  Quote,
  ValidationRow,
} from "@/contexts/AnalyticsContext";

const INSTITUTIONS = ["State University", "Metro College", "Tech Institute", "Liberal Arts College"];
const SCHOOLS = ["School of Business", "School of Education", "School of Engineering", "School of Arts & Sciences"];
const PROGRAM_LEVELS = ["Undergraduate", "Graduate", "Doctoral", "Certificate"];

export function useFilters(result: AnalysisResult | null) {
  const [filters, setFilters] = useState<FilterState>({
    themes: [],
    institutions: [],
    programLevels: [],
    schools: [],
    searchQuery: "",
  });

  const availableThemes = useMemo(
    () => result?.themeSummary.map((t) => t.name) ?? [],
    [result]
  );

  // Determine which topic IDs pass the theme + search filter
  const activeTopicIds = useMemo(() => {
    if (!result) return new Set<number>();
    const query = filters.searchQuery.trim().toLowerCase();
    return new Set(
      result.themeSummary
        .filter((t) => {
          const matchesTheme =
            filters.themes.length === 0 || filters.themes.includes(t.name);
          const matchesSearch =
            !query ||
            t.name.toLowerCase().includes(query) ||
            t.keywords.some((k) => k.toLowerCase().includes(query));
          return matchesTheme && matchesSearch;
        })
        .map((t) => t.topic)
    );
  }, [result, filters.themes, filters.searchQuery]);

  // Filtered datasets
  const filtered = useMemo(() => {
    if (!result) return null;

    const themeSummary: ThemeSummary[] = result.themeSummary.filter((t) =>
      activeTopicIds.has(t.topic)
    );

    const themeSentiment: ThemeSentiment[] = result.themeSentiment.filter((t) =>
      activeTopicIds.has(t.topic)
    );

    // Stratified rows — filter by topic AND by group
    const filterStratified = (
      rows: StratifiedRow[],
      groupFilter: string[]
    ): StratifiedRow[] =>
      rows.filter(
        (r) =>
          activeTopicIds.has(r.topic) &&
          (groupFilter.length === 0 || groupFilter.includes(r.group))
      );

    const byInstitution = filterStratified(
      result.byInstitution,
      filters.institutions
    );
    const byProgram = filterStratified(
      result.byProgram,
      filters.programLevels
    );
    const bySchool = filterStratified(result.bySchool, filters.schools);

    const trends: TrendRow[] = result.trends.filter((t) =>
      activeTopicIds.has(t.topic)
    );

    const emergingThemes: EmergingTheme[] = result.emergingThemes.filter((e) =>
      activeTopicIds.has(e.topic)
    );

    const quotes: Quote[] = result.quotes.filter((q) =>
      activeTopicIds.has(q.topic)
    );

    const validation: ValidationRow[] = result.validation.filter(
      (v) => v.topic === -1 || activeTopicIds.has(v.topic)
    );

    // Recalculate summary stats based on filtered themes
    const filteredCleanedComments = themeSummary.reduce(
      (s, t) => s + t.count,
      0
    );

    // Regenerate executive summary for filtered data
    const topThemes = themeSummary
      .slice(0, 5)
      .map((t) => `${t.name} (n=${t.count})`)
      .join(", ");
    const strengths = themeSentiment
      .filter((s) => s.avgCompound > 0.1)
      .sort((a, b) => b.avgCompound - a.avgCompound)
      .slice(0, 3);
    const concerns = themeSentiment
      .filter((s) => s.avgCompound < -0.1)
      .sort((a, b) => a.avgCompound - b.avgCompound)
      .slice(0, 3);
    const emerging = emergingThemes.filter((e) => e.emerging);

    let summary = `EXECUTIVE SUMMARY\n${"=".repeat(50)}\n\n`;
    if (filters.themes.length > 0 || filters.searchQuery.trim()) {
      summary += `[Filtered view: ${themeSummary.length} of ${result.themeSummary.length} themes shown]\n\n`;
    }
    if (filters.institutions.length > 0) {
      summary += `[Institutions: ${filters.institutions.join(", ")}]\n`;
    }
    if (filters.programLevels.length > 0) {
      summary += `[Program Levels: ${filters.programLevels.join(", ")}]\n`;
    }
    if (filters.schools.length > 0) {
      summary += `[Schools: ${filters.schools.join(", ")}]\n`;
    }
    summary += `\nAnalysis of ${filteredCleanedComments} comments across ${themeSummary.length} themes.\n\n`;
    summary += `TOP THEMES\n${"-".repeat(30)}\n${topThemes || "None"}\n\n`;
    summary += `STRENGTHS (Positive Themes)\n${"-".repeat(30)}\n`;
    summary += strengths.length > 0
      ? strengths
          .map(
            (s) =>
              `  ${s.topicName} (avg sentiment: ${s.avgCompound}, ${s.positivePct}% positive)`
          )
          .join("\n")
      : "  No strongly positive themes in current filter.";
    summary += `\n\nCONCERNS (Negative Themes)\n${"-".repeat(30)}\n`;
    summary += concerns.length > 0
      ? concerns
          .map(
            (s) =>
              `  ${s.topicName} (avg sentiment: ${s.avgCompound}, ${s.negativePct}% negative)`
          )
          .join("\n")
      : "  No strongly negative themes in current filter.";
    summary += `\n\nEMERGING ISSUES\n${"-".repeat(30)}\n`;
    summary += emerging.length > 0
      ? emerging
          .map(
            (e) =>
              `  ${e.topicName} (growth: ${e.growthRate}x, latest count: ${e.latestCount})`
          )
          .join("\n")
      : "  No emerging themes detected.";

    return {
      themeSummary,
      themeSentiment,
      byInstitution,
      byProgram,
      bySchool,
      trends,
      emergingThemes,
      quotes,
      validation,
      executiveSummary: summary,
      filteredCleanedComments,
    };
  }, [result, activeTopicIds, filters]);

  const isFiltered = useMemo(
    () =>
      filters.themes.length > 0 ||
      filters.institutions.length > 0 ||
      filters.programLevels.length > 0 ||
      filters.schools.length > 0 ||
      filters.searchQuery.trim().length > 0,
    [filters]
  );

  return {
    filters,
    setFilters,
    filtered,
    isFiltered,
    availableThemes,
    availableInstitutions: INSTITUTIONS,
    availableProgramLevels: PROGRAM_LEVELS,
    availableSchools: SCHOOLS,
  };
}
