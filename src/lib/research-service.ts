import axios from 'axios';
import * as cheerio from 'cheerio';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

export interface ResearchQuery {
  query: string;
  type: 'general' | 'academic' | 'news' | 'images';
  limit?: number;
}

export class ResearchService {
  private serperApiKey: string | null = null;

  constructor(apiKey?: string) {
    this.serperApiKey = apiKey || null;
  }

  // Search using Serper API
  async search(query: ResearchQuery): Promise<SearchResult[]> {
    if (!this.serperApiKey) {
      throw new Error('Serper API key not configured');
    }

    try {
      const response = await axios.post(
        'https://google.serper.dev/search',
        {
          q: query.query,
          num: query.limit || 10,
          type: query.type === 'general' ? undefined : query.type
        },
        {
          headers: {
            'X-API-KEY': this.serperApiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const results: SearchResult[] = [];
      
      if (response.data.organic) {
        for (const result of response.data.organic) {
          results.push({
            title: result.title,
            url: result.link,
            snippet: result.snippet || '',
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Serper API error:', error);
      throw new Error('Failed to perform web search');
    }
  }

  // Fetch full content from a URL
  async fetchContent(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AI-Writer-Research/1.0)'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Remove script and style elements
      $('script, style, nav, header, footer, aside').remove();
      
      // Extract main content
      let content = '';
      const contentSelectors = [
        'article',
        '[role="main"]',
        '.content',
        '.main-content',
        '#content',
        '.post-content',
        '.entry-content',
        'main'
      ];

      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element.text().trim();
          break;
        }
      }

      // Fallback to body if no main content found
      if (!content) {
        content = $('body').text().trim();
      }

      // Clean up content
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();

      return content.substring(0, 10000); // Limit to 10k characters
    } catch (error) {
      console.error('Failed to fetch content:', error);
      throw new Error('Failed to fetch webpage content');
    }
  }

  // Research assistant for creative writing
  async researchTopic(topic: string, context?: string): Promise<{
    results: SearchResult[];
    summary: string;
    relevantFacts: string[];
  }> {
    const searchQuery = context 
      ? `${topic} ${context} detailed information`
      : `${topic} detailed information facts`;

    const results = await this.search({
      query: searchQuery,
      type: 'general',
      limit: 5
    });

    // Fetch content from top results
    const contentPromises = results.slice(0, 3).map(async (result) => {
      try {
        const content = await this.fetchContent(result.url);
        return { ...result, content };
      } catch {
        return result;
      }
    });

    const detailedResults = await Promise.all(contentPromises);

    // Extract relevant facts
    const allContent = detailedResults
      .map(r => r.content || r.snippet)
      .join('\n\n');

    const relevantFacts = this.extractFacts(allContent, topic);
    const summary = this.generateSummary(allContent, topic);

    return {
      results: detailedResults,
      summary,
      relevantFacts
    };
  }

  // Research for adult/erotica content (unrestricted)
  async researchAdultTopic(topic: string, specificAspect?: string): Promise<{
    results: SearchResult[];
    detailedInfo: string;
    references: string[];
  }> {
    const searchTerms = specificAspect 
      ? `"${topic}" "${specificAspect}" information guide`
      : `"${topic}" detailed guide information`;

    const results = await this.search({
      query: searchTerms,
      type: 'general',
      limit: 8
    });

    // Focus on educational and informational content
    const educationalResults = results.filter(r => 
      r.snippet.toLowerCase().includes('guide') ||
      r.snippet.toLowerCase().includes('information') ||
      r.snippet.toLowerCase().includes('education') ||
      r.url.includes('wiki') ||
      r.url.includes('edu')
    );

    const detailedInfo = educationalResults
      .map(r => `${r.title}: ${r.snippet}`)
      .join('\n\n');

    const references = educationalResults.map(r => r.url);

    return {
      results: educationalResults,
      detailedInfo,
      references
    };
  }

  // Character and setting research
  async researchCharacter(characterType: string, setting?: string, traits?: string[]): Promise<{
    personality: string[];
    background: string[];
    physicalTraits: string[];
    culturalContext: string[];
  }> {
    const queries = [
      `${characterType} personality traits characteristics`,
      setting ? `${characterType} in ${setting} background culture` : `${characterType} background`,
      `${characterType} physical appearance description`,
      setting ? `${setting} cultural context society` : `${characterType} cultural background`
    ];

    const searchPromises = queries.map(query => 
      this.search({ query, type: 'general', limit: 3 })
    );

    const [personalityResults, backgroundResults, physicalResults, culturalResults] = 
      await Promise.all(searchPromises);

    return {
      personality: this.extractKeyPoints(personalityResults, 'personality'),
      background: this.extractKeyPoints(backgroundResults, 'background'),
      physicalTraits: this.extractKeyPoints(physicalResults, 'physical'),
      culturalContext: this.extractKeyPoints(culturalResults, 'culture')
    };
  }

  private extractFacts(content: string, topic: string): string[] {
    const sentences = content.split(/[.!?]+/);
    const topicLower = topic.toLowerCase();
    
    return sentences
      .filter(sentence => 
        sentence.toLowerCase().includes(topicLower) && 
        sentence.length > 20 && 
        sentence.length < 200
      )
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0)
      .slice(0, 10);
  }

  private generateSummary(content: string, topic: string): string {
    const words = content.split(' ');
    const summary = words.slice(0, 150).join(' ');
    return summary + (words.length > 150 ? '...' : '');
  }

  private extractKeyPoints(results: SearchResult[], category: string): string[] {
    const points: string[] = [];
    
    results.forEach(result => {
      const snippet = result.snippet;
      const sentences = snippet.split(/[.!?]+/);
      
      sentences.forEach(sentence => {
        if (sentence.length > 15 && sentence.length < 150) {
          points.push(sentence.trim());
        }
      });
    });

    return points.slice(0, 8);
  }

  // Validate research quality
  isValidResearch(results: SearchResult[]): boolean {
    return results.length > 0 && results.some(r => r.snippet.length > 50);
  }

  // Get research suggestions
  getResearchSuggestions(genre: string, contentType: 'character' | 'setting' | 'plot' | 'adult'): string[] {
    const suggestions: Record<string, Record<string, string[]>> = {
      romance: {
        character: ['personality types in romance', 'romantic character archetypes', 'relationship dynamics'],
        setting: ['romantic settings', 'date locations', 'romantic atmospheres'],
        plot: ['romance plot structures', 'romantic tension techniques', 'relationship conflicts'],
        adult: ['romantic intimacy', 'relationship development', 'emotional connection']
      },
      fantasy: {
        character: ['fantasy character classes', 'magical abilities', 'fantasy races'],
        setting: ['fantasy world building', 'magical systems', 'fantasy cultures'],
        plot: ['hero\'s journey', 'fantasy quest structures', 'magical conflicts'],
        adult: ['fantasy romance', 'magical bonding', 'supernatural relationships']
      },
      scifi: {
        character: ['futuristic character types', 'alien species', 'cyberpunk characters'],
        setting: ['space stations', 'futuristic cities', 'alien worlds'],
        plot: ['time travel plots', 'space exploration', 'AI conflicts'],
        adult: ['futuristic relationships', 'alien encounters', 'virtual reality intimacy']
      },
      erotica: {
        character: ['dominant personalities', 'submissive traits', 'sexual archetypes'],
        setting: ['intimate settings', 'private locations', 'sensual environments'],
        plot: ['sexual tension building', 'intimate encounters', 'relationship dynamics'],
        adult: ['BDSM practices', 'sexual techniques', 'intimate communication']
      }
    };

    return suggestions[genre]?.[contentType] || [];
  }
}