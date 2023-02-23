import * as natural from 'natural';

export class SentimentAnalyser {
  private analyzer: natural.SentimentAnalyzer;
  private stemmer: natural.Stemmer;

  constructor() {
    this.analyzer = new natural.SentimentAnalyzer('English', this.stemmer, 'afinn');
    this.stemmer = natural.PorterStemmer;
  }

  analyze(text: string): number {
    const tokenzier = new natural.WordTokenizer();
    const tokens = tokenzier.tokenize(text);
    const stems = tokens.map((token: any)  => this.stemmer.stem(token));
    const sentiment = this.analyzer.getSentiment(stems);
    return sentiment;
  }
}