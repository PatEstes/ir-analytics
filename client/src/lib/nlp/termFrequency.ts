/**
 * termFrequency.ts — Extract term frequencies from comments
 * Used to power word cloud visualizations in the Themes tab.
 * Applies stop-word filtering, minimum length, and optional per-topic grouping.
 */

export interface TermFrequency {
  term: string;
  count: number;
  /** Normalized weight 0.0–1.0 relative to the max count in the set */
  weight: number;
}

/**
 * Common English stop words plus survey-specific filler words.
 * Kept as a Set for O(1) lookup.
 */
const STOP_WORDS = new Set([
  // Standard English stop words
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
  "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "shall", "can", "need",
  "not", "no", "nor", "so", "if", "then", "than", "too", "very",
  "just", "about", "above", "after", "again", "all", "also", "am",
  "any", "because", "before", "between", "both", "each", "few",
  "get", "got", "here", "her", "him", "his", "how", "its", "it",
  "into", "more", "most", "my", "me", "much", "now", "only", "other",
  "our", "out", "over", "own", "same", "she", "he", "some", "such",
  "that", "their", "them", "there", "these", "they", "this", "those",
  "through", "under", "until", "up", "us", "we", "what", "when",
  "where", "which", "while", "who", "whom", "why", "you", "your",
  // Survey-specific filler
  "really", "think", "feel", "like", "lot", "many", "well", "even",
  "still", "going", "make", "made", "one", "two", "way", "thing",
  "things", "something", "anything", "everything", "nothing",
  "always", "never", "often", "sometimes", "usually", "already",
  "enough", "quite", "rather", "somewhat", "however", "although",
  "though", "since", "during", "within", "without", "around",
  "don", "doesn", "didn", "won", "wouldn", "couldn", "shouldn",
  "isn", "wasn", "aren", "weren", "hasn", "haven", "hadn",
  "don't", "doesn't", "didn't", "won't", "wouldn't", "couldn't",
  "shouldn't", "isn't", "wasn't", "aren't", "weren't",
  "i", "i'm", "i've", "i'd", "i'll", "it's", "that's", "there's",
  "what's", "let's", "he's", "she's", "we're", "they're", "you're",
  "we've", "they've", "you've", "he'd", "she'd", "we'd", "they'd",
  "you'd", "he'll", "she'll", "we'll", "they'll", "you'll",
  "been", "being", "having", "doing", "getting", "going", "making",
  "taking", "coming", "looking", "wanting", "using", "trying",
  "saying", "knowing", "thinking", "seeing", "finding", "giving",
  "telling", "asking", "working", "seeming", "leaving", "calling",
  "keep", "kept", "let", "put", "seem", "seemed", "take", "took",
  "come", "came", "give", "gave", "tell", "told", "say", "said",
  "know", "knew", "see", "saw", "find", "found", "want", "wanted",
  "use", "used", "try", "tried", "look", "looked", "ask", "asked",
  "work", "worked", "call", "called", "able", "also", "back",
  "first", "last", "long", "great", "little", "new", "old",
  "right", "big", "high", "different", "small", "large", "next",
  "early", "young", "important", "public", "bad", "good",
  "ve", "re", "ll", "didn", "don", "doesn", "won", "wouldn",
  "couldn", "shouldn", "isn", "wasn", "aren", "weren",
]);

/**
 * Tokenize text into lowercase words, stripping punctuation.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, "")) // trim leading/trailing quotes/hyphens
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

/**
 * Extract the top N most frequent terms from an array of comment texts.
 *
 * @param texts - Array of comment strings
 * @param maxTerms - Maximum number of terms to return (default: 40)
 * @returns Sorted array of TermFrequency objects (highest count first)
 */
export function extractTermFrequencies(
  texts: string[],
  maxTerms: number = 40
): TermFrequency[] {
  const counts = new Map<string, number>();

  for (const text of texts) {
    const tokens = tokenize(text);
    for (const token of tokens) {
      counts.set(token, (counts.get(token) || 0) + 1);
    }
  }

  // Sort by count descending, take top N
  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTerms);

  if (sorted.length === 0) return [];

  const maxCount = sorted[0][1];

  return sorted.map(([term, count]) => ({
    term,
    count,
    weight: maxCount > 0 ? count / maxCount : 0,
  }));
}

/**
 * Extract term frequencies grouped by topic.
 * Returns a map from topic name → TermFrequency[].
 *
 * @param commentsByTopic - Map of topic name → array of comment texts
 * @param maxTermsPerTopic - Max terms per topic (default: 30)
 */
export function extractTermsByTopic(
  commentsByTopic: Map<string, string[]>,
  maxTermsPerTopic: number = 30
): Map<string, TermFrequency[]> {
  const result = new Map<string, TermFrequency[]>();

  for (const [topic, texts] of Array.from(commentsByTopic)) {
    result.set(topic, extractTermFrequencies(texts, maxTermsPerTopic));
  }

  return result;
}
