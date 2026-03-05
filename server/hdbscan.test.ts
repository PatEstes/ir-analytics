/**
 * Tests for the HDBSCAN clustering implementation.
 * Tests the core algorithm with synthetic data to verify:
 * - Correct cluster discovery
 * - Noise detection
 * - Edge cases (empty data, small datasets, single cluster)
 * - Consistency of output format
 */

import { describe, expect, it } from "vitest";
import { hdbscan } from "../client/src/lib/nlp/hdbscan";

/**
 * Generate a cluster of points around a center with some noise.
 */
function generateCluster(
  center: number[],
  numPoints: number,
  spread: number,
  seed: number = 42
): number[][] {
  const points: number[][] = [];
  // Simple seeded pseudo-random
  let s = seed;
  const rand = () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (let i = 0; i < numPoints; i++) {
    const point = center.map((c) => c + (rand() - 0.5) * spread * 2);
    points.push(point);
  }
  return points;
}

describe("HDBSCAN", () => {
  it("returns empty result for empty input", () => {
    const result = hdbscan([], { minClusterSize: 3 });
    expect(result.labels).toEqual([]);
    expect(result.probabilities).toEqual([]);
    expect(result.noiseIndices).toEqual([]);
    expect(result.numClusters).toBe(0);
  });

  it("marks all points as noise when fewer than minClusterSize", () => {
    const data = [[1, 0], [0, 1], [1, 1]];
    const result = hdbscan(data, { minClusterSize: 5, metric: "euclidean" });
    expect(result.labels).toEqual([-1, -1, -1]);
    expect(result.noiseIndices).toEqual([0, 1, 2]);
    expect(result.numClusters).toBe(0);
  });

  it("discovers two well-separated clusters", () => {
    // Two tight clusters far apart
    const cluster1 = generateCluster([0, 0], 15, 0.1, 42);
    const cluster2 = generateCluster([10, 10], 15, 0.1, 99);
    const data = [...cluster1, ...cluster2];

    const result = hdbscan(data, {
      minClusterSize: 3,
      minSamples: 3,
      metric: "euclidean",
    });

    // Should find at least 2 clusters
    expect(result.numClusters).toBeGreaterThanOrEqual(2);

    // Points in cluster1 should share a label
    const cluster1Labels = new Set(result.labels.slice(0, 15).filter((l) => l >= 0));
    const cluster2Labels = new Set(result.labels.slice(15, 30).filter((l) => l >= 0));

    // The two groups should have different dominant labels
    if (cluster1Labels.size > 0 && cluster2Labels.size > 0) {
      const label1 = result.labels.slice(0, 15).filter((l) => l >= 0);
      const label2 = result.labels.slice(15, 30).filter((l) => l >= 0);
      if (label1.length > 0 && label2.length > 0) {
        // Most common label in each group should differ
        const mode1 = label1.sort((a, b) =>
          label1.filter((v) => v === a).length - label1.filter((v) => v === b).length
        ).pop();
        const mode2 = label2.sort((a, b) =>
          label2.filter((v) => v === a).length - label2.filter((v) => v === b).length
        ).pop();
        expect(mode1).not.toBe(mode2);
      }
    }
  });

  it("detects noise points between clusters", () => {
    // Two tight clusters with several scattered noise points in between
    const cluster1 = generateCluster([0, 0], 15, 0.05, 42);
    const cluster2 = generateCluster([10, 10], 15, 0.05, 99);
    // Scatter noise points far from both clusters
    const noisePoints = [[5, 5], [3, 7], [7, 3]];
    const data = [...cluster1, ...cluster2, ...noisePoints];

    const result = hdbscan(data, {
      minClusterSize: 5,
      minSamples: 3,
      metric: "euclidean",
    });

    // HDBSCAN should detect some noise points
    // The scattered points are far from both tight clusters
    expect(result.noiseIndices.length).toBeGreaterThan(0);
    // At least one of the scattered noise points should be flagged
    const scatteredIndices = [30, 31, 32];
    const scatteredNoise = scatteredIndices.filter(idx => result.noiseIndices.includes(idx));
    expect(scatteredNoise.length).toBeGreaterThan(0);
  });

  it("returns valid probabilities between 0 and 1", () => {
    const cluster1 = generateCluster([0, 0], 10, 0.2, 42);
    const cluster2 = generateCluster([5, 5], 10, 0.2, 99);
    const data = [...cluster1, ...cluster2];

    const result = hdbscan(data, {
      minClusterSize: 3,
      minSamples: 3,
      metric: "euclidean",
    });

    for (const prob of result.probabilities) {
      expect(prob).toBeGreaterThanOrEqual(0);
      expect(prob).toBeLessThanOrEqual(1);
    }
  });

  it("labels array has same length as input", () => {
    const data = generateCluster([0, 0], 20, 1, 42);
    const result = hdbscan(data, { minClusterSize: 3, metric: "euclidean" });

    expect(result.labels.length).toBe(20);
    expect(result.probabilities.length).toBe(20);
  });

  it("works with cosine distance metric", () => {
    // Generate points in different angular directions (for cosine distance)
    const cluster1: number[][] = [];
    const cluster2: number[][] = [];

    for (let i = 0; i < 12; i++) {
      // Points roughly in the [1, 0] direction
      cluster1.push([1 + Math.random() * 0.1, Math.random() * 0.1]);
      // Points roughly in the [0, 1] direction
      cluster2.push([Math.random() * 0.1, 1 + Math.random() * 0.1]);
    }

    const data = [...cluster1, ...cluster2];
    const result = hdbscan(data, {
      minClusterSize: 3,
      minSamples: 3,
      metric: "cosine",
    });

    // Should find clusters (cosine distance separates angular directions)
    expect(result.numClusters).toBeGreaterThanOrEqual(1);
    expect(result.labels.length).toBe(data.length);
  });

  it("handles high-dimensional data (embedding-like)", () => {
    // Simulate 384-dimensional embeddings (like MiniLM)
    const dim = 384;
    const data: number[][] = [];

    // Two clusters in high-dimensional space
    for (let i = 0; i < 15; i++) {
      const point = new Array(dim).fill(0);
      for (let d = 0; d < dim; d++) {
        point[d] = (d < dim / 2 ? 1 : 0) + (Math.random() - 0.5) * 0.1;
      }
      data.push(point);
    }
    for (let i = 0; i < 15; i++) {
      const point = new Array(dim).fill(0);
      for (let d = 0; d < dim; d++) {
        point[d] = (d >= dim / 2 ? 1 : 0) + (Math.random() - 0.5) * 0.1;
      }
      data.push(point);
    }

    const result = hdbscan(data, {
      minClusterSize: 3,
      minSamples: 3,
      metric: "cosine",
    });

    expect(result.labels.length).toBe(30);
    expect(result.numClusters).toBeGreaterThanOrEqual(1);
  });

  it("noiseIndices matches labels with -1", () => {
    const cluster1 = generateCluster([0, 0], 10, 0.1, 42);
    const cluster2 = generateCluster([10, 10], 10, 0.1, 99);
    const data = [...cluster1, ...cluster2, [5, 5]];

    const result = hdbscan(data, {
      minClusterSize: 3,
      minSamples: 3,
      metric: "euclidean",
    });

    // noiseIndices should exactly match indices where labels === -1
    const noiseFromLabels = result.labels
      .map((label, idx) => (label === -1 ? idx : -1))
      .filter((idx) => idx >= 0);

    expect(result.noiseIndices.sort()).toEqual(noiseFromLabels.sort());
  });

  it("numClusters matches unique non-negative labels", () => {
    const cluster1 = generateCluster([0, 0], 12, 0.1, 42);
    const cluster2 = generateCluster([10, 10], 12, 0.1, 99);
    const data = [...cluster1, ...cluster2];

    const result = hdbscan(data, {
      minClusterSize: 3,
      minSamples: 3,
      metric: "euclidean",
    });

    const uniqueLabels = new Set(result.labels.filter((l) => l >= 0));
    expect(result.numClusters).toBe(uniqueLabels.size);
  });
});
