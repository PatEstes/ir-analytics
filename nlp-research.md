# NLP Pipeline Research Notes

## Transformers.js (v3.8.1 stable, v4 preview)
- Package: `@huggingface/transformers`
- Runs ONNX models in browser via WASM (CPU) or WebGPU (GPU)
- Pipeline API: `pipeline('task', 'model')` — same as Python
- Key pipelines needed:
  - `feature-extraction` with `Xenova/all-MiniLM-L6-v2` for embeddings (384-dim vectors)
  - `sentiment-analysis` with `Xenova/distilbert-base-uncased-finetuned-sst-2-english`
- Supports quantization: `dtype: 'q8'` (default WASM) or `'q4'` for smaller models
- Models cached in browser after first download

## VADER Sentiment (vader-sentiment npm)
- Pure JS port, works in browser, no dependencies
- Returns compound score (-1 to 1), pos, neg, neu
- Better for social/survey text than transformer models
- Much faster than transformer-based sentiment (no model download)

## Clustering (ml-kmeans npm)
- Pure JS k-means implementation
- Works with high-dimensional vectors (384-dim embeddings)
- Returns cluster assignments and centroids
- Need to determine optimal k (silhouette method or use seed topic count)

## Architecture Plan
1. Parse CSV properly (papaparse)
2. Extract comment texts
3. Generate embeddings with Transformers.js feature-extraction pipeline
4. Run VADER sentiment on each comment (fast, no model needed)
5. K-means cluster the embeddings (k = number of seed topics or auto-detect)
6. Match clusters to seed topics by computing centroid similarity to seed topic embeddings
7. Find representative quotes by cosine similarity to centroids
8. Compute trend data from dates
9. Compute validation metrics (silhouette-like coherence)
