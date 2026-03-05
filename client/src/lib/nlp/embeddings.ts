/**
 * embeddings.ts — Generate sentence embeddings using Transformers.js
 * Uses all-MiniLM-L6-v2 (quantized) running 100% in the browser via ONNX/WASM.
 * Model is ~22MB, downloaded once and cached in the browser's Cache API.
 */

import type { FeatureExtractionPipeline } from "@huggingface/transformers";

let extractor: FeatureExtractionPipeline | null = null;

/**
 * Initialize the embedding model. Downloads on first use, cached afterwards.
 * @param onProgress Callback for model download progress
 */
export async function initEmbeddingModel(
  onProgress?: (info: { status: string; progress?: number }) => void
): Promise<void> {
  if (extractor) return;

  // Dynamic import to avoid complex union type issues with pipeline overloads
  const transformers = await import("@huggingface/transformers");
  const pipelineFn = transformers.pipeline as any;
  extractor = (await pipelineFn("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
    dtype: "q8",
    progress_callback: (data: { status: string; progress?: number }) => {
      onProgress?.(data);
    },
  })) as FeatureExtractionPipeline;
}

/**
 * Generate embeddings for an array of texts.
 * Processes in batches to avoid memory issues with large datasets.
 * @returns Array of 384-dimensional embedding vectors
 */
export async function generateEmbeddings(
  texts: string[],
  onProgress?: (completed: number, total: number) => void,
  batchSize: number = 32
): Promise<number[][]> {
  if (!extractor) {
    throw new Error("Embedding model not initialized. Call initEmbeddingModel() first.");
  }

  const allEmbeddings: number[][] = [];
  const total = texts.length;

  for (let i = 0; i < total; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    // Truncate long texts to ~128 tokens (~512 chars) for MiniLM
    const truncated = batch.map((t) => t.slice(0, 512));

    const output = await extractor(truncated, {
      pooling: "mean",
      normalize: true,
    });

    // Extract the embedding arrays from the tensor output
    const batchEmbeddings = output.tolist() as number[][];
    allEmbeddings.push(...batchEmbeddings);

    onProgress?.(Math.min(i + batchSize, total), total);
  }

  return allEmbeddings;
}

/**
 * Generate embedding for a single text (used for seed topic matching).
 */
export async function embedText(text: string): Promise<number[]> {
  const results = await generateEmbeddings([text]);
  return results[0];
}

/**
 * Compute cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}
