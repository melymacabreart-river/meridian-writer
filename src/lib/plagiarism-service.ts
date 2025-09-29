import { ResearchService } from './research-service';
import { compareTwoStrings, findBestMatch } from 'string-similarity';

export interface PlagiarismResult {
  overallScore: number; // 0-100, higher = more likely plagiarized
  matches: PlagiarismMatch[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface PlagiarismMatch {
  text: string;
  sourceUrl?: string;
  sourceTitle?: string;
  similarity: number; // 0-1
  context: string;
  startIndex: number;
  endIndex: number;
}

export interface ContentAnalysis {
  wordCount: number;
  uniquePhrases: string[];
  commonPhrases: string[];
  readabilityScore: number;
  genre: string;
  suggestedImprovements: string[];
}

export class PlagiarismService {
  private researchService: ResearchService;
  private minPhraseLength = 8; // Minimum words for a phrase to be checked
  private similarityThreshold = 0.7; // Threshold for flagging similarity

  constructor(serperApiKey?: string) {
    this.researchService = new ResearchService(serperApiKey);
  }

  // Main plagiarism check function
  async checkPlagiarism(text: string, title?: string): Promise<PlagiarismResult> {
    const phrases = this.extractSignificantPhrases(text);
    const matches: PlagiarismMatch[] = [];

    // Check each significant phrase against web sources
    for (const phrase of phrases) {
      try {
        const searchResults = await this.researchService.search({
          query: `"${phrase.text}"`,
          type: 'general',
          limit: 5
        });

        for (const result of searchResults) {
          const similarity = this.calculateSimilarity(phrase.text, result.snippet);
          
          if (similarity > this.similarityThreshold) {
            matches.push({
              text: phrase.text,
              sourceUrl: result.url,
              sourceTitle: result.title,
              similarity,
              context: result.snippet,
              startIndex: phrase.startIndex,
              endIndex: phrase.endIndex
            });
          }
        }
      } catch (error) {
        console.error('Error checking phrase:', phrase.text, error);
      }
    }

    const overallScore = this.calculateOverallScore(matches, text);
    const riskLevel = this.determineRiskLevel(overallScore, matches);
    const recommendations = this.generateRecommendations(matches, overallScore);

    return {
      overallScore,
      matches,
      riskLevel,
      recommendations
    };
  }

  // Check against specific sources (useful for checking your own Google Docs)
  async checkAgainstSources(text: string, sources: string[]): Promise<PlagiarismResult> {
    const phrases = this.extractSignificantPhrases(text);
    const matches: PlagiarismMatch[] = [];

    for (const phrase of phrases) {
      for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        const similarity = this.calculateSimilarity(phrase.text, source);
        
        if (similarity > this.similarityThreshold) {
          matches.push({
            text: phrase.text,
            sourceTitle: `Source Document ${i + 1}`,
            similarity,
            context: this.extractContext(source, phrase.text),
            startIndex: phrase.startIndex,
            endIndex: phrase.endIndex
          });
        }
      }
    }

    const overallScore = this.calculateOverallScore(matches, text);
    const riskLevel = this.determineRiskLevel(overallScore, matches);
    const recommendations = this.generateRecommendations(matches, overallScore);

    return {
      overallScore,
      matches,
      riskLevel,
      recommendations
    };
  }

  // Analyze content quality and provide insights
  async analyzeContent(text: string): Promise<ContentAnalysis> {
    const words = text.split(/\s+/);
    const wordCount = words.length;
    
    const uniquePhrases = this.extractUniquePhrases(text);
    const commonPhrases = this.extractCommonPhrases(text);
    const readabilityScore = this.calculateReadabilityScore(text);
    const genre = await this.detectGenre(text);
    const suggestedImprovements = this.generateImprovementSuggestions(text, readabilityScore);

    return {
      wordCount,
      uniquePhrases,
      commonPhrases,
      readabilityScore,
      genre,
      suggestedImprovements
    };
  }

  // Fast similarity check without web search (for real-time checking)
  quickSimilarityCheck(text1: string, text2: string): number {
    return compareTwoStrings(text1.toLowerCase(), text2.toLowerCase());
  }

  // Extract significant phrases for checking
  private extractSignificantPhrases(text: string): Array<{
    text: string;
    startIndex: number;
    endIndex: number;
  }> {
    const sentences = text.split(/[.!?]+/);
    const phrases: Array<{ text: string; startIndex: number; endIndex: number }> = [];
    let currentIndex = 0;

    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);
      
      if (words.length >= this.minPhraseLength) {
        // Extract overlapping phrases of different lengths
        for (let length = this.minPhraseLength; length <= Math.min(15, words.length); length++) {
          for (let i = 0; i <= words.length - length; i++) {
            const phraseWords = words.slice(i, i + length);
            const phraseText = phraseWords.join(' ');
            
            // Skip if phrase is too common or generic
            if (!this.isGenericPhrase(phraseText)) {
              phrases.push({
                text: phraseText,
                startIndex: currentIndex + sentence.indexOf(phraseWords[0]),
                endIndex: currentIndex + sentence.indexOf(phraseWords[phraseWords.length - 1]) + phraseWords[phraseWords.length - 1].length
              });
            }
          }
        }
      }
      
      currentIndex += sentence.length + 1;
    }

    // Remove duplicates and sort by significance
    return phrases
      .filter((phrase, index, self) => 
        self.findIndex(p => p.text === phrase.text) === index
      )
      .sort((a, b) => b.text.length - a.text.length)
      .slice(0, 20); // Limit to top 20 phrases
  }

  private calculateSimilarity(phrase: string, compareText: string): number {
    const phraseWords = phrase.toLowerCase().split(/\s+/);
    const compareWords = compareText.toLowerCase().split(/\s+/);
    
    // Check for exact matches
    const exactMatch = compareText.toLowerCase().includes(phrase.toLowerCase());
    if (exactMatch) return 1.0;
    
    // Check for partial matches
    let matchingWords = 0;
    phraseWords.forEach(word => {
      if (compareWords.includes(word) && word.length > 3) {
        matchingWords++;
      }
    });
    
    const partialSimilarity = matchingWords / phraseWords.length;
    
    // Use string similarity as well
    const stringSimilarity = compareTwoStrings(phrase, compareText);
    
    return Math.max(partialSimilarity, stringSimilarity);
  }

  private isGenericPhrase(phrase: string): boolean {
    const genericPhrases = [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'it was', 'there was', 'there were', 'it is', 'this is', 'that is',
      'he said', 'she said', 'they said', 'I said', 'you said',
      'very good', 'very bad', 'so much', 'a lot', 'many people'
    ];
    
    const lowerPhrase = phrase.toLowerCase();
    return genericPhrases.some(generic => lowerPhrase.includes(generic)) ||
           phrase.split(' ').length < 4 ||
           /^\d+/.test(phrase); // Starts with numbers
  }

  private calculateOverallScore(matches: PlagiarismMatch[], originalText: string): number {
    if (matches.length === 0) return 0;
    
    const totalWords = originalText.split(/\s+/).length;
    let flaggedWords = 0;
    
    matches.forEach(match => {
      flaggedWords += match.text.split(/\s+/).length;
    });
    
    const percentage = (flaggedWords / totalWords) * 100;
    const averageSimilarity = matches.reduce((sum, match) => sum + match.similarity, 0) / matches.length;
    
    return Math.min(100, percentage * averageSimilarity * 1.2);
  }

  private determineRiskLevel(score: number, matches: PlagiarismMatch[]): 'low' | 'medium' | 'high' {
    const highSimilarityMatches = matches.filter(m => m.similarity > 0.9).length;
    
    if (score < 15 && highSimilarityMatches === 0) return 'low';
    if (score < 35 && highSimilarityMatches < 2) return 'medium';
    return 'high';
  }

  private generateRecommendations(matches: PlagiarismMatch[], score: number): string[] {
    const recommendations: string[] = [];
    
    if (score < 10) {
      recommendations.push('Your content appears to be original. Great work!');
    } else if (score < 25) {
      recommendations.push('Your content has some similarities to existing sources. Consider paraphrasing flagged sections.');
      if (matches.length > 0) {
        recommendations.push('Review highlighted matches and rewrite in your own words.');
      }
    } else {
      recommendations.push('High similarity detected. Significant revision recommended.');
      recommendations.push('Rewrite flagged sections using your own voice and perspective.');
      recommendations.push('Add more original analysis and personal insights.');
      if (matches.some(m => m.similarity > 0.95)) {
        recommendations.push('Some sections appear to be direct copies. These must be rewritten or properly quoted.');
      }
    }
    
    return recommendations;
  }

  private extractContext(source: string, phrase: string): string {
    const index = source.toLowerCase().indexOf(phrase.toLowerCase());
    if (index === -1) return source.substring(0, 100) + '...';
    
    const start = Math.max(0, index - 50);
    const end = Math.min(source.length, index + phrase.length + 50);
    
    return (start > 0 ? '...' : '') + 
           source.substring(start, end) + 
           (end < source.length ? '...' : '');
  }

  private extractUniquePhrases(text: string): string[] {
    // Extract distinctive phrases that make the writing unique
    const sentences = text.split(/[.!?]+/);
    const uniquePhrases: string[] = [];
    
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length > 20 && trimmed.length < 100) {
        // Look for creative or distinctive language
        if (this.hasCreativeLanguage(trimmed)) {
          uniquePhrases.push(trimmed);
        }
      }
    });
    
    return uniquePhrases.slice(0, 10);
  }

  private extractCommonPhrases(text: string): string[] {
    // Find phrases that appear frequently in the text
    const phrases = new Map<string, number>();
    const words = text.toLowerCase().split(/\s+/);
    
    for (let length = 3; length <= 6; length++) {
      for (let i = 0; i <= words.length - length; i++) {
        const phrase = words.slice(i, i + length).join(' ');
        phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
      }
    }
    
    return Array.from(phrases.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase]) => phrase);
  }

  private calculateReadabilityScore(text: string): number {
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    const syllables = this.countSyllables(text);
    
    // Flesch Reading Ease Score
    const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));
    return Math.max(0, Math.min(100, score));
  }

  private countSyllables(text: string): number {
    const words = text.toLowerCase().replace(/[^a-zA-Z\s]/g, '').split(/\s+/);
    let totalSyllables = 0;
    
    words.forEach(word => {
      if (word.length > 0) {
        totalSyllables += this.countWordSyllables(word);
      }
    });
    
    return totalSyllables;
  }

  private countWordSyllables(word: string): number {
    word = word.toLowerCase();
    let count = 0;
    const vowels = 'aeiouy';
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }
    
    // Adjust for silent e
    if (word.endsWith('e')) count--;
    
    return Math.max(1, count);
  }

  private async detectGenre(text: string): Promise<string> {
    const lowerText = text.toLowerCase();
    
    // Genre detection based on keywords and style
    const genreIndicators = {
      romance: ['love', 'heart', 'kiss', 'passion', 'romance', 'relationship', 'dating'],
      mystery: ['detective', 'clue', 'murder', 'investigate', 'suspect', 'evidence'],
      fantasy: ['magic', 'dragon', 'wizard', 'spell', 'kingdom', 'quest', 'sword'],
      scifi: ['space', 'alien', 'robot', 'future', 'technology', 'planet', 'laser'],
      horror: ['fear', 'dark', 'scream', 'blood', 'death', 'nightmare', 'terror'],
      erotica: ['desire', 'body', 'touch', 'intimate', 'sensual', 'pleasure', 'arousal']
    };
    
    let maxScore = 0;
    let detectedGenre = 'general';
    
    Object.entries(genreIndicators).forEach(([genre, keywords]) => {
      const score = keywords.reduce((acc, keyword) => {
        const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
        return acc + matches;
      }, 0);
      
      if (score > maxScore) {
        maxScore = score;
        detectedGenre = genre;
      }
    });
    
    return detectedGenre;
  }

  private hasCreativeLanguage(text: string): boolean {
    const creativePhrases = [
      'like', 'as if', 'seemed to', 'reminded', 'appeared', 'felt like',
      'metaphor', 'symbolized', 'represented', 'evoked'
    ];
    
    const lowerText = text.toLowerCase();
    return creativePhrases.some(phrase => lowerText.includes(phrase)) ||
           text.includes('"') || // Contains dialogue
           /[,;:]/.test(text); // Contains complex punctuation
  }

  private generateImprovementSuggestions(text: string, readabilityScore: number): string[] {
    const suggestions: string[] = [];
    
    if (readabilityScore < 30) {
      suggestions.push('Consider simplifying sentence structure for better readability');
      suggestions.push('Break up long, complex sentences');
    } else if (readabilityScore > 80) {
      suggestions.push('Content is very easy to read - consider adding more sophisticated vocabulary for mature audiences');
    }
    
    const avgSentenceLength = text.split(/[.!?]+/).reduce((acc, sentence) => {
      return acc + sentence.trim().split(/\s+/).length;
    }, 0) / text.split(/[.!?]+/).length;
    
    if (avgSentenceLength > 25) {
      suggestions.push('Average sentence length is quite long - consider varying sentence structure');
    }
    
    const wordCount = text.split(/\s+/).length;
    if (wordCount < 500) {
      suggestions.push('Consider expanding your content with more detail and examples');
    }
    
    return suggestions;
  }
}