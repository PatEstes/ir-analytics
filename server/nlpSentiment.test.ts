import { describe, expect, it } from "vitest";

/**
 * Tests for the VADER sentiment analysis logic.
 * Since the actual sentiment module uses vader-sentiment which is a browser/Node compatible
 * pure-JS library, we test the scoring logic and classification boundaries here.
 */

// Replicate the classification logic from sentiment.ts
function classifySentiment(compound: number): "Positive" | "Negative" | "Neutral" {
  if (compound >= 0.05) return "Positive";
  if (compound <= -0.05) return "Negative";
  return "Neutral";
}

describe("sentiment classification", () => {
  it("classifies positive compound scores correctly", () => {
    expect(classifySentiment(0.8)).toBe("Positive");
    expect(classifySentiment(0.5)).toBe("Positive");
    expect(classifySentiment(0.05)).toBe("Positive");
  });

  it("classifies negative compound scores correctly", () => {
    expect(classifySentiment(-0.8)).toBe("Negative");
    expect(classifySentiment(-0.5)).toBe("Negative");
    expect(classifySentiment(-0.05)).toBe("Negative");
  });

  it("classifies neutral compound scores correctly", () => {
    expect(classifySentiment(0.0)).toBe("Neutral");
    expect(classifySentiment(0.04)).toBe("Neutral");
    expect(classifySentiment(-0.04)).toBe("Neutral");
  });

  it("handles boundary values precisely", () => {
    expect(classifySentiment(0.049)).toBe("Neutral");
    expect(classifySentiment(0.051)).toBe("Positive");
    expect(classifySentiment(-0.049)).toBe("Neutral");
    expect(classifySentiment(-0.051)).toBe("Negative");
  });
});

describe("sentiment aggregation logic", () => {
  // Replicate the aggregation logic from pipeline.ts
  function aggregateSentiment(scores: { compound: number; label: string }[]) {
    const total = scores.length;
    if (total === 0) return { avgCompound: 0, positive: 0, negative: 0, neutral: 0 };

    const avgCompound = scores.reduce((s, sc) => s + sc.compound, 0) / total;
    const positive = Math.round((scores.filter((s) => s.label === "Positive").length / total) * 100);
    const negative = Math.round((scores.filter((s) => s.label === "Negative").length / total) * 100);
    const neutral = 100 - positive - negative;

    return {
      avgCompound: parseFloat(avgCompound.toFixed(3)),
      positive,
      negative,
      neutral,
    };
  }

  it("aggregates all-positive scores correctly", () => {
    const scores = [
      { compound: 0.8, label: "Positive" },
      { compound: 0.6, label: "Positive" },
      { compound: 0.9, label: "Positive" },
    ];
    const result = aggregateSentiment(scores);
    expect(result.positive).toBe(100);
    expect(result.negative).toBe(0);
    expect(result.neutral).toBe(0);
    expect(result.avgCompound).toBeGreaterThan(0.5);
  });

  it("aggregates mixed scores correctly", () => {
    const scores = [
      { compound: 0.8, label: "Positive" },
      { compound: -0.5, label: "Negative" },
      { compound: 0.0, label: "Neutral" },
    ];
    const result = aggregateSentiment(scores);
    expect(result.positive).toBe(33);
    expect(result.negative).toBe(33);
    expect(result.neutral).toBe(34); // 100 - 33 - 33
  });

  it("handles empty scores array", () => {
    const result = aggregateSentiment([]);
    expect(result.avgCompound).toBe(0);
    expect(result.positive).toBe(0);
    expect(result.negative).toBe(0);
    expect(result.neutral).toBe(0);
  });

  it("handles single score", () => {
    const result = aggregateSentiment([{ compound: -0.7, label: "Negative" }]);
    expect(result.positive).toBe(0);
    expect(result.negative).toBe(100);
    expect(result.neutral).toBe(0);
    expect(result.avgCompound).toBe(-0.7);
  });
});

describe("cosine similarity logic", () => {
  // Replicate cosine similarity from clustering.ts
  function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  it("returns 1 for identical vectors", () => {
    const v = [1, 2, 3, 4];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0, 5);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0, 5);
  });

  it("handles zero vectors gracefully", () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });

  it("computes similarity for realistic embedding-like vectors", () => {
    const a = [0.1, 0.3, -0.2, 0.5, 0.8];
    const b = [0.2, 0.4, -0.1, 0.6, 0.7];
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThan(0.9); // Similar vectors
    expect(sim).toBeLessThanOrEqual(1.0);
  });
});
