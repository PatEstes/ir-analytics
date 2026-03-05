declare module "vader-sentiment" {
  interface PolarityScores {
    compound: number;
    pos: number;
    neg: number;
    neu: number;
  }

  interface SentimentIntensityAnalyzerType {
    polarity_scores(text: string): PolarityScores;
  }

  const vader: {
    SentimentIntensityAnalyzer: SentimentIntensityAnalyzerType;
  };

  export default vader;
}
