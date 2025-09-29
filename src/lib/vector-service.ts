import OpenAI from 'openai';

const together = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY,
  baseURL: 'https://api.together.xyz/v1',
});

export interface VectorMemory {
  id: string;
  content: string;
  embedding: number[];
  type: 'personal' | 'relationship' | 'creative' | 'factual' | 'preference' | 'story_element';
  metadata: {
    userId: string;
    companionId?: string;
    documentId?: string;
    importance: number;
    tags: string[];
    timestamp: number;
  };
}

export class VectorService {
  private static instance: VectorService;
  
  static getInstance(): VectorService {
    if (!VectorService.instance) {
      VectorService.instance = new VectorService();
    }
    return VectorService.instance;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await together.embeddings.create({
        model: 'BAAI/bge-large-en-v1.5',
        input: text.slice(0, 8000), // Truncate to prevent token limit issues
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Return zero vector as fallback
      return new Array(1536).fill(0);
    }
  }

  async storeMemoryWithVector(
    content: string,
    type: VectorMemory['type'],
    metadata: VectorMemory['metadata']
  ): Promise<VectorMemory> {
    const embedding = await this.generateEmbedding(content);
    
    const memory: VectorMemory = {
      id: this.generateId(),
      content,
      embedding,
      type,
      metadata: {
        ...metadata,
        timestamp: Date.now()
      }
    };

    // In production, store to database with vector
    await this.saveVectorMemoryToDatabase(memory);
    
    return memory;
  }

  async findSimilarMemories(
    queryText: string,
    userId: string,
    companionId?: string,
    documentId?: string,
    limit: number = 10,
    minSimilarity: number = 0.7
  ): Promise<VectorMemory[]> {
    const queryEmbedding = await this.generateEmbedding(queryText);
    
    // In production, use pgvector similarity search
    const memories = await this.searchSimilarVectors(
      queryEmbedding,
      userId,
      companionId,
      documentId,
      limit,
      minSimilarity
    );
    
    return memories;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  private async saveVectorMemoryToDatabase(memory: VectorMemory): Promise<void> {
    try {
      // Import Prisma client locally to avoid circular dependencies
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      await prisma.memory.create({
        data: {
          id: memory.id,
          type: memory.type,
          content: memory.content,
          embeddingData: JSON.stringify(memory.embedding),
          context: memory.metadata,
          importance: memory.metadata.importance,
          tags: memory.metadata.tags,
          userId: memory.metadata.userId,
          companionId: memory.metadata.companionId,
          documentId: memory.metadata.documentId,
          lastAccessed: new Date(),
          createdAt: new Date(memory.metadata.timestamp)
        }
      });
      
      await prisma.$disconnect();
    } catch (error) {
      console.error('Error saving vector memory:', error);
    }
  }

  private async searchSimilarVectors(
    queryEmbedding: number[],
    userId: string,
    companionId?: string,
    documentId?: string,
    limit: number = 10,
    minSimilarity: number = 0.7
  ): Promise<VectorMemory[]> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      const whereClause: any = {
        userId,
        embeddingData: { not: null }
      };
      
      if (companionId) whereClause.companionId = companionId;
      if (documentId) whereClause.documentId = documentId;
      
      const memories = await prisma.memory.findMany({
        where: whereClause,
        take: limit * 3, // Get more to filter by similarity
        orderBy: { createdAt: 'desc' }
      });
      
      await prisma.$disconnect();
      
      // Calculate similarity scores and filter
      const scoredMemories = memories
        .map(mem => {
          if (!mem.embeddingData) return null;
          
          const embedding = JSON.parse(mem.embeddingData) as number[];
          const similarity = this.cosineSimilarity(queryEmbedding, embedding);
          
          if (similarity < minSimilarity) return null;
          
          return {
            memory: {
              id: mem.id,
              content: mem.content,
              embedding,
              type: mem.type as VectorMemory['type'],
              metadata: {
                userId: mem.userId,
                companionId: mem.companionId || undefined,
                documentId: mem.documentId || undefined,
                importance: mem.importance,
                tags: mem.tags,
                timestamp: mem.createdAt.getTime()
              }
            } as VectorMemory,
            similarity
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
      
      return scoredMemories.map(item => item.memory);
    } catch (error) {
      console.error('Error searching similar vectors:', error);
      return [];
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Story Bible specific vector operations
export class StoryBibleVectorService extends VectorService {
  async indexStoryElement(
    element: {
      type: 'character' | 'plot' | 'world' | 'theme' | 'scene';
      name: string;
      description: string;
      details: any;
    },
    documentId: string,
    userId: string
  ): Promise<void> {
    const content = `${element.name}: ${element.description}. ${JSON.stringify(element.details)}`;
    
    await this.storeMemoryWithVector(
      content,
      'story_element',
      {
        userId,
        documentId,
        importance: 8, // Story elements are high importance
        tags: [element.type, element.name.toLowerCase().replace(/\s+/g, '-')]
      }
    );
  }

  async findRelatedStoryElements(
    query: string,
    documentId: string,
    userId: string,
    elementType?: string
  ): Promise<VectorMemory[]> {
    const memories = await this.findSimilarMemories(
      query,
      userId,
      undefined,
      documentId,
      20,
      0.6 // Lower threshold for creative connections
    );

    return elementType 
      ? memories.filter(m => m.metadata.tags.includes(elementType))
      : memories;
  }

  async maintainStoryConsistency(
    newContent: string,
    documentId: string,
    userId: string
  ): Promise<{
    consistencyScore: number;
    conflicts: string[];
    suggestions: string[];
  }> {
    const relatedElements = await this.findRelatedStoryElements(
      newContent,
      documentId,
      userId
    );

    // Analyze for consistency (simplified implementation)
    const consistencyScore = relatedElements.length > 0 ? 0.8 : 0.3;
    const conflicts: string[] = [];
    const suggestions: string[] = [];

    if (relatedElements.length > 0) {
      suggestions.push('Consider referencing established character traits');
      suggestions.push('Maintain consistency with previous world-building');
    }

    return {
      consistencyScore,
      conflicts,
      suggestions
    };
  }
}

export const vectorService = VectorService.getInstance();
export const storyBibleService = new StoryBibleVectorService();