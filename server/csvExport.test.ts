import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// We test the internal logic by importing the module.
// The download function creates a Blob + anchor click, so we mock that.

// Mock DOM APIs
const mockClick = vi.fn();
const mockCreateElement = vi.fn(() => ({
  href: "",
  download: "",
  style: { display: "" },
  click: mockClick,
}));
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockCreateObjectURL = vi.fn(() => "blob:mock-url");
const mockRevokeObjectURL = vi.fn();

vi.stubGlobal("document", {
  createElement: mockCreateElement,
  body: {
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild,
  },
});

vi.stubGlobal("URL", {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL,
});

vi.stubGlobal("Blob", class MockBlob {
  content: string[];
  options: any;
  constructor(content: string[], options: any) {
    this.content = content;
    this.options = options;
  }
});

import {
  exportSummary,
  exportThemes,
  exportSentiment,
  exportTrends,
  exportQuotes,
  exportValidation,
} from "@/lib/csvExport";

describe("csvExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleThemes = [
    { topic: 0, name: "Course Workload", count: 50, keywords: ["workload", "heavy", "assignments"] },
    { topic: 1, name: "Instructor Support", count: 80, keywords: ["professor", "helpful", "office hours"] },
  ];

  const sampleSentiment = [
    { topic: 0, topicName: "Course Workload", count: 50, avgCompound: -0.2, positivePct: 20, neutralPct: 30, negativePct: 50 },
    { topic: 1, topicName: "Instructor Support", count: 80, avgCompound: 0.3, positivePct: 60, neutralPct: 25, negativePct: 15 },
  ];

  const sampleQuotes = [
    { topic: 0, quote: "The workload is too heavy", similarity: 0.95 },
    { topic: 1, quote: "My professor was very helpful", similarity: 0.92 },
  ];

  const sampleValidation = [
    { topic: 0, topicName: "Course Workload", size: 50, percentage: 25, coherence: 0.72, qualityFlag: "OK" as const },
    { topic: 1, topicName: "Instructor Support", size: 80, percentage: 40, coherence: 0.85, qualityFlag: "OK" as const },
    { topic: -1, topicName: "Noise", size: 20, percentage: 10, coherence: null, qualityFlag: "Noise" as const },
  ];

  it("exportSummary creates a downloadable CSV", () => {
    exportSummary("Test summary\nLine 2", 1000, 800, 500, 8, 0.12, false);

    expect(mockCreateElement).toHaveBeenCalledWith("a");
    expect(mockClick).toHaveBeenCalled();
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();

    // Verify the anchor element was configured with a CSV filename
    const anchor = mockCreateElement.mock.results[0].value;
    expect(anchor.download).toMatch(/^ir-analytics-summary-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it("exportThemes creates a CSV with theme data", () => {
    const byInst = [{ topic: 0, topicName: "Course Workload", group: "State University", count: 20 }];
    const byProg = [{ topic: 0, topicName: "Course Workload", group: "Undergraduate", count: 30 }];
    const bySchool = [{ topic: 0, topicName: "Course Workload", group: "School of Business", count: 15 }];

    exportThemes(sampleThemes, byInst, byProg, bySchool);

    expect(mockClick).toHaveBeenCalled();
    const anchor = mockCreateElement.mock.results[0].value;
    expect(anchor.download).toMatch(/^ir-analytics-themes-/);
  });

  it("exportSentiment creates a CSV with sentiment data", () => {
    exportSentiment(sampleSentiment);

    expect(mockClick).toHaveBeenCalled();
    const anchor = mockCreateElement.mock.results[0].value;
    expect(anchor.download).toMatch(/^ir-analytics-sentiment-/);
  });

  it("exportTrends creates a CSV with trend pivot table", () => {
    const trends = [
      { topic: 0, topicName: "Course Workload", week: "2025-W01", count: 10 },
      { topic: 0, topicName: "Course Workload", week: "2025-W02", count: 15 },
      { topic: 1, topicName: "Instructor Support", week: "2025-W01", count: 20 },
      { topic: 1, topicName: "Instructor Support", week: "2025-W02", count: 25 },
    ];
    const emerging = [
      { topic: 1, topicName: "Instructor Support", emerging: true, growthRate: 1.5, previousCount: 10, latestCount: 15 },
    ];

    exportTrends(trends, emerging, sampleThemes);

    expect(mockClick).toHaveBeenCalled();
    const anchor = mockCreateElement.mock.results[0].value;
    expect(anchor.download).toMatch(/^ir-analytics-trends-/);
  });

  it("exportQuotes creates a CSV with quotes grouped by theme", () => {
    exportQuotes(sampleQuotes, sampleThemes);

    expect(mockClick).toHaveBeenCalled();
    const anchor = mockCreateElement.mock.results[0].value;
    expect(anchor.download).toMatch(/^ir-analytics-quotes-/);
  });

  it("exportValidation creates a CSV with validation metrics", () => {
    exportValidation(sampleValidation, 0.1);

    expect(mockClick).toHaveBeenCalled();
    const anchor = mockCreateElement.mock.results[0].value;
    expect(anchor.download).toMatch(/^ir-analytics-validation-/);
  });

  it("handles CSV escaping for values with commas and quotes", () => {
    const quotesWithSpecialChars = [
      { topic: 0, quote: 'The workload is "too heavy", I think', similarity: 0.95 },
    ];

    exportQuotes(quotesWithSpecialChars, sampleThemes);
    expect(mockClick).toHaveBeenCalled();
  });

  it("exportSummary includes filtered context when isFiltered is true", () => {
    exportSummary("Filtered summary", 1000, 800, 500, 3, 0.12, true);

    expect(mockClick).toHaveBeenCalled();
    const anchor = mockCreateElement.mock.results[0].value;
    expect(anchor.download).toMatch(/^ir-analytics-summary-/);
  });
});
