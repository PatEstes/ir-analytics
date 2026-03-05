/**
 * sentiment.ts — VADER-based sentiment analysis
 * Pure JavaScript implementation — no model download, instant results.
 * VADER is specifically tuned for social media and survey text.
 * 100% client-side, no data leaves the browser.
 */

import vader from "vader-sentiment";

export interface SentimentScore {
  compound: number; // -1 (most negative) to +1 (most positive)
  positive: number;
  negative: number;
  neutral: number;
  label: "Positive" | "Negative" | "Neutral";
}

/**
 * Analyze sentiment for a single text using VADER.
 * Returns compound score and classification label.
 */
export function analyzeSentiment(text: string): SentimentScore {
  const intensity = vader.SentimentIntensityAnalyzer.polarity_scores(text);

  let label: SentimentScore["label"];
  if (intensity.compound >= 0.05) {
    label = "Positive";
  } else if (intensity.compound <= -0.05) {
    label = "Negative";
  } else {
    label = "Neutral";
  }

  return {
    compound: intensity.compound,
    positive: intensity.pos,
    negative: intensity.neg,
    neutral: intensity.neu,
    label,
  };
}

/**
 * Batch analyze sentiment for an array of texts.
 * VADER is fast enough to process thousands of texts synchronously,
 * but we yield to the event loop periodically to keep the UI responsive.
 */
export async function batchAnalyzeSentiment(
  texts: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<SentimentScore[]> {
  const results: SentimentScore[] = [];
  const total = texts.length;

  for (let i = 0; i < total; i++) {
    results.push(analyzeSentiment(texts[i]));

    // Yield to event loop every 200 items to keep UI responsive
    if (i % 200 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      onProgress?.(i, total);
    }
  }

  onProgress?.(total, total);
  return results;
}
