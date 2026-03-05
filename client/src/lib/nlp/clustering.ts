/**
 * clustering.ts — K-Means clustering for topic discovery
 * Groups comment embeddings into clusters that represent topics.
 * Uses ml-kmeans for efficient JavaScript-based clustering.
 * 100% client-side, no data leaves the browser.
 */

import { kmeans } from "ml-kmeans";
import { cosineSimilarity } from "./embeddings";

export interface ClusterResult {
  /** Cluster assignment for each comment (0-indexed) */
  assignments: number[];
  /** Centroid vectors for each cluster */
  centroids: number[][];
  /** Number of clusters */
  k: number;
  /** Indices of comments classified as noise (-1 assignment) */
  noiseIndices: number[];
}

/**
 * Higher-education seed topics with representative descriptions.
 * Used to label discovered clusters by semantic similarity.
 */
export const SEED_TOPICS = [
  {
    name: "Instructor Support",
    description: "Teaching quality, instructor availability, responsiveness, helpfulness, office hours, feedback on assignments",
  },
  {
    name: "Advising & Communication",
    description: "Academic advising quality, advisor responsiveness, communication clarity, registration guidance, degree planning",
  },
  {
    name: "Course Workload",
    description: "Assignment volume, homework difficulty, reading load, time management, course pacing, workload balance",
  },
  {
    name: "Curriculum Relevance",
    description: "Course content applicability, real-world relevance, career preparation, outdated material, practical skills",
  },
  {
    name: "Campus Resources",
    description: "Library, tutoring center, writing center, computer labs, study spaces, campus facilities, student services",
  },
  {
    name: "Technical Platform Issues",
    description: "LMS problems, online platform bugs, Blackboard Canvas issues, video conferencing, technology access, WiFi",
  },
  {
    name: "Diversity & Inclusion",
    description: "Inclusive environment, cultural sensitivity, diverse perspectives, representation, belonging, equity, accessibility",
  },
  {
    name: "Student Engagement",
    description: "Class participation, group projects, peer interaction, extracurricular activities, student organizations, campus life",
  },
];

/**
 * Determine optimal number of clusters using a heuristic.
 * Uses the seed topic count as a baseline, adjusted by dataset size.
 */
function determineK(n: number): number {
  if (n < 20) return Math.min(3, n);
  if (n < 50) return Math.min(5, Math.floor(n / 5));
  if (n < 200) return Math.min(8, Math.floor(Math.sqrt(n)));
  // For larger datasets, use seed topic count as baseline
  return Math.min(SEED_TOPICS.length + 2, Math.floor(Math.sqrt(n / 2)));
}

/**
 * Run k-means clustering on embedding vectors.
 * Returns cluster assignments, centroids, and noise detection.
 */
export function clusterEmbeddings(
  embeddings: number[][],
  k?: number
): ClusterResult {
  const n = embeddings.length;
  const actualK = k || determineK(n);

  // Run k-means with multiple initializations for stability
  const result = kmeans(embeddings, actualK, {
    initialization: "kmeans++",
    maxIterations: 100,
    seed: 42,
  });

  const assignments = result.clusters;
  const centroids = result.centroids;

  // Detect noise: comments far from their cluster centroid
  const noiseIndices: number[] = [];
  const clusterDistances: Map<number, number[]> = new Map();

  for (let i = 0; i < n; i++) {
    const cluster = assignments[i];
    const sim = cosineSimilarity(embeddings[i], centroids[cluster]);
    if (!clusterDistances.has(cluster)) {
      clusterDistances.set(cluster, []);
    }
    clusterDistances.get(cluster)!.push(sim);
  }

  // Mark comments with similarity < mean - 1.5*std as noise
  for (let i = 0; i < n; i++) {
    const cluster = assignments[i];
    const sims = clusterDistances.get(cluster)!;
    const mean = sims.reduce((a, b) => a + b, 0) / sims.length;
    const std = Math.sqrt(sims.reduce((a, b) => a + (b - mean) ** 2, 0) / sims.length);
    const sim = cosineSimilarity(embeddings[i], centroids[cluster]);

    if (sim < mean - 1.5 * std) {
      noiseIndices.push(i);
    }
  }

  return {
    assignments,
    centroids: centroids.map((c) => Array.from(c)),
    k: actualK,
    noiseIndices,
  };
}

/**
 * Label clusters by matching centroids to seed topics using cosine similarity.
 * Each cluster gets the name of the most similar seed topic.
 * If no seed topic is similar enough, the cluster gets a generic label.
 */
export async function labelClusters(
  centroids: number[][],
  embedText: (text: string) => Promise<number[]>
): Promise<string[]> {
  // Generate embeddings for seed topic descriptions
  const seedEmbeddings: number[][] = [];
  for (const topic of SEED_TOPICS) {
    const emb = await embedText(`${topic.name}: ${topic.description}`);
    seedEmbeddings.push(emb);
  }

  const labels: string[] = [];
  const usedTopics = new Set<number>();

  // For each centroid, find the most similar seed topic
  for (const centroid of centroids) {
    let bestSim = -1;
    let bestIdx = -1;

    for (let j = 0; j < seedEmbeddings.length; j++) {
      if (usedTopics.has(j)) continue; // Don't reuse topics
      const sim = cosineSimilarity(centroid, seedEmbeddings[j]);
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = j;
      }
    }

    // Threshold: if similarity is too low, use a generic label
    if (bestSim > 0.25 && bestIdx >= 0) {
      labels.push(SEED_TOPICS[bestIdx].name);
      usedTopics.add(bestIdx);
    } else {
      labels.push(`Topic ${labels.length + 1}`);
    }
  }

  return labels;
}

/**
 * Find the most representative comment for each cluster.
 * The representative is the comment closest to the cluster centroid.
 */
export function findRepresentativeQuotes(
  embeddings: number[][],
  assignments: number[],
  centroids: number[][],
  texts: string[],
  topN: number = 3
): Map<number, { text: string; similarity: number; index: number }[]> {
  const quotes = new Map<number, { text: string; similarity: number; index: number }[]>();

  // Compute similarity of each comment to its cluster centroid
  const scored: { cluster: number; index: number; similarity: number }[] = [];
  for (let i = 0; i < embeddings.length; i++) {
    const cluster = assignments[i];
    const sim = cosineSimilarity(embeddings[i], centroids[cluster]);
    scored.push({ cluster, index: i, similarity: sim });
  }

  // Group by cluster and sort by similarity (descending)
  type ScoredItem = { cluster: number; index: number; similarity: number };
  const grouped = new Map<number, ScoredItem[]>();
  for (const item of scored) {
    if (!grouped.has(item.cluster)) {
      grouped.set(item.cluster, []);
    }
    grouped.get(item.cluster)!.push(item);
  }

  grouped.forEach((items: ScoredItem[], cluster: number) => {
    items.sort((a: ScoredItem, b: ScoredItem) => b.similarity - a.similarity);
    quotes.set(
      cluster,
      items.slice(0, topN).map((item: ScoredItem) => ({
        text: texts[item.index],
        similarity: item.similarity,
        index: item.index,
      }))
    );
  });

  return quotes;
}
