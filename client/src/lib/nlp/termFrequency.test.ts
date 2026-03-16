/**
 * termFrequency.test.ts — Tests for term frequency extraction and word cloud data
 */

import { describe, it, expect } from "vitest";
import {
  extractTermFrequencies,
  extractTermsByTopic,
  type TermFrequency,
} from "./termFrequency";

describe("extractTermFrequencies", () => {
  it("returns empty array for empty input", () => {
    expect(extractTermFrequencies([])).toEqual([]);
    expect(extractTermFrequencies([""])).toEqual([]);
  });

  it("extracts terms and sorts by count descending", () => {
    const texts = [
      "The professor was incredibly helpful and supportive",
      "Professor Smith helped students understand complex material",
      "The professor explains concepts clearly and is very supportive",
    ];
    const result = extractTermFrequencies(texts, 10);

    expect(result.length).toBeGreaterThan(0);
    // "professor" appears in all 3 texts
    expect(result[0].term).toBe("professor");
    expect(result[0].count).toBe(3);
    // Sorted descending
    for (let i = 1; i < result.length; i++) {
      expect(result[i].count).toBeLessThanOrEqual(result[i - 1].count);
    }
  });

  it("filters out stop words", () => {
    const texts = ["The and or but is was are were be been being have has had"];
    const result = extractTermFrequencies(texts);
    expect(result).toEqual([]);
  });

  it("filters out words shorter than 3 characters", () => {
    const texts = ["I am ok no do go up at on in"];
    const result = extractTermFrequencies(texts);
    expect(result).toEqual([]);
  });

  it("normalizes weight relative to max count", () => {
    const texts = [
      "campus campus campus campus",
      "library library",
      "resources",
    ];
    const result = extractTermFrequencies(texts, 10);

    const campus = result.find((t) => t.term === "campus");
    const library = result.find((t) => t.term === "library");
    const resources = result.find((t) => t.term === "resources");

    expect(campus).toBeDefined();
    expect(campus!.weight).toBe(1.0); // max count = 4
    expect(campus!.count).toBe(4);

    expect(library).toBeDefined();
    expect(library!.weight).toBe(0.5); // 2/4
    expect(library!.count).toBe(2);

    expect(resources).toBeDefined();
    expect(resources!.weight).toBe(0.25); // 1/4
    expect(resources!.count).toBe(1);
  });

  it("respects maxTerms limit", () => {
    const texts = [
      "alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa quebec romeo sierra tango uniform victor whiskey xray yankee zulu",
    ];
    const result = extractTermFrequencies(texts, 5);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("handles punctuation and mixed case", () => {
    const texts = [
      "Professor's lectures are EXCELLENT! The professor, truly outstanding.",
    ];
    const result = extractTermFrequencies(texts, 10);
    const terms = result.map((t) => t.term);
    expect(terms).toContain("professor");
    expect(terms).toContain("lectures");
    expect(terms).toContain("excellent");
    expect(terms).toContain("outstanding");
    expect(terms).toContain("truly");
  });

  it("preserves hyphenated words", () => {
    const texts = [
      "The well-prepared instructor gave a well-prepared lecture on well-prepared topics",
    ];
    const result = extractTermFrequencies(texts, 10);
    const terms = result.map((t) => t.term);
    expect(terms).toContain("well-prepared");
  });
});

describe("extractTermsByTopic", () => {
  it("returns per-topic term frequencies", () => {
    const commentsByTopic = new Map<string, string[]>();
    commentsByTopic.set("Instructor Support", [
      "Professor was excellent and supportive",
      "Faculty teaching quality is outstanding",
    ]);
    commentsByTopic.set("Campus Resources", [
      "Library hours need to be extended",
      "Campus counseling services are helpful",
    ]);

    const result = extractTermsByTopic(commentsByTopic, 10);

    expect(result.size).toBe(2);
    expect(result.has("Instructor Support")).toBe(true);
    expect(result.has("Campus Resources")).toBe(true);

    const instructorTerms = result.get("Instructor Support")!.map((t) => t.term);
    expect(instructorTerms).toContain("professor");

    const campusTerms = result.get("Campus Resources")!.map((t) => t.term);
    expect(campusTerms).toContain("campus");
  });

  it("returns empty map for empty input", () => {
    const result = extractTermsByTopic(new Map());
    expect(result.size).toBe(0);
  });
});
