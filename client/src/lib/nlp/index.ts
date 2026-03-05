export { parseCSV, autoDetectColumns } from "./csvParser";
export type { RawComment, ColumnMapping } from "./csvParser";

export { initEmbeddingModel, generateEmbeddings, embedText, cosineSimilarity } from "./embeddings";

export { analyzeSentiment, batchAnalyzeSentiment } from "./sentiment";
export type { SentimentScore } from "./sentiment";

export { clusterEmbeddings, labelClusters, findRepresentativeQuotes, SEED_TOPICS } from "./clustering";
export type { ClusterResult } from "./clustering";

export { runPipeline } from "./pipeline";
export type { PipelineProgress, PipelineResult } from "./pipeline";
