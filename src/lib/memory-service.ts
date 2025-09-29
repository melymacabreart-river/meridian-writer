export interface Memory {
  id: string;
  type: 'personal' | 'relationship' | 'creative' | 'factual' | 'preference';
  content: string;
  context?: any;
  importance: number; // 1-10 scale
  tags: string[];
  lastAccessed: Date;
  createdAt: Date;
}

export interface ConversationContext {
  mood?: string;
  topics: string[];
  relationshipDynamics: any;
  importantMoments: string[];
  preferences: any;
}

import { vectorService, VectorMemory } from './vector-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class MemoryService {
  private memories: Map<string, Memory[]> = new Map();

  // Store a new memory with vector embedding
  async storeMemory(
    userId: string,
    companionId: string | null,
    type: Memory['type'],
    content: string,
    context?: any,
    importance: number = 5,
    tags: string[] = []
  ): Promise<void> {
    const memory: Memory = {
      id: this.generateId(),
      type,
      content,
      context,
      importance,
      tags,
      lastAccessed: new Date(),
      createdAt: new Date()
    };

    // Store in local cache
    const key = companionId ? `${userId}:${companionId}` : userId;
    const userMemories = this.memories.get(key) || [];
    userMemories.push(memory);
    this.memories.set(key, userMemories);

    // Store with vector embedding for semantic search
    await vectorService.storeMemoryWithVector(
      content,
      type as VectorMemory['type'],
      {
        userId,
        companionId: companionId || undefined,
        importance,
        tags
      }
    );

    // Save to database with embedding
    await this.saveToDatabase(userId, companionId, memory);
  }

  // Retrieve relevant memories using vector similarity
  async getRelevantMemories(
    userId: string,
    companionId: string | null,
    query: string,
    limit: number = 10
  ): Promise<Memory[]> {
    // Use vector similarity search for better context retrieval
    const vectorMemories = await vectorService.findSimilarMemories(
      query,
      userId,
      companionId || undefined,
      undefined,
      limit,
      0.6 // Lowered threshold for more relevant results
    );

    // Convert vector memories to Memory interface
    const memories: Memory[] = vectorMemories.map(vm => ({
      id: vm.id,
      type: vm.type as Memory['type'],
      content: vm.content,
      context: vm.metadata,
      importance: vm.metadata.importance,
      tags: vm.metadata.tags,
      lastAccessed: new Date(),
      createdAt: new Date(vm.metadata.timestamp)
    }));

    // Fallback to local cache if no vector results
    if (memories.length === 0) {
      const key = companionId ? `${userId}:${companionId}` : userId;
      const userMemories = this.memories.get(key) || [];
      
      const scoredMemories = userMemories
        .map(memory => ({
          memory,
          score: this.calculateRelevanceScore(memory, query)
        }))
        .filter(item => item.score > 0.1)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return scoredMemories.map(item => item.memory);
    }

    return memories;
  }

  // Get memories by type
  async getMemoriesByType(
    userId: string,
    companionId: string | null,
    type: Memory['type'],
    limit: number = 20
  ): Promise<Memory[]> {
    const key = companionId ? `${userId}:${companionId}` : userId;
    const userMemories = this.memories.get(key) || [];

    return userMemories
      .filter(memory => memory.type === type)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);
  }

  // Build conversation context from memories
  async buildConversationContext(
    userId: string,
    companionId: string,
    recentMessages: any[] = []
  ): Promise<ConversationContext> {
    const [
      personalMemories,
      relationshipMemories,
      preferenceMemories
    ] = await Promise.all([
      this.getMemoriesByType(userId, companionId, 'personal', 5),
      this.getMemoriesByType(userId, companionId, 'relationship', 10),
      this.getMemoriesByType(userId, companionId, 'preference', 5)
    ]);

    const topics = this.extractTopics(recentMessages);
    const mood = this.detectMood(recentMessages);

    return {
      mood,
      topics,
      relationshipDynamics: this.analyzeRelationship(relationshipMemories),
      importantMoments: relationshipMemories
        .filter(m => m.importance >= 8)
        .map(m => m.content)
        .slice(0, 3),
      preferences: this.consolidatePreferences(preferenceMemories)
    };
  }

  // Generate system prompt with memory context
  async generateSystemPromptWithMemory(
    basePrompt: string,
    userId: string,
    companionId: string,
    context?: ConversationContext
  ): Promise<string> {
    const conversationContext = context || 
      await this.buildConversationContext(userId, companionId);

    let enhancedPrompt = basePrompt;

    // Add relationship context
    if (conversationContext.relationshipDynamics) {
      enhancedPrompt += `\n\nRelationship Context: ${JSON.stringify(conversationContext.relationshipDynamics)}`;
    }

    // Add important moments
    if (conversationContext.importantMoments.length > 0) {
      enhancedPrompt += `\n\nImportant shared moments: ${conversationContext.importantMoments.join('; ')}`;
    }

    // Add preferences
    if (conversationContext.preferences) {
      enhancedPrompt += `\n\nUser preferences: ${JSON.stringify(conversationContext.preferences)}`;
    }

    // Add current mood context
    if (conversationContext.mood) {
      enhancedPrompt += `\n\nCurrent mood/context: ${conversationContext.mood}`;
    }

    enhancedPrompt += `\n\nImportant: Use this context naturally in conversation. Don't explicitly reference "memories" or make it obvious you're using stored information. Respond as if you naturally remember these things about your relationship.`;

    return enhancedPrompt;
  }

  // Analyze message for memory extraction
  async extractMemoriesFromMessage(
    userId: string,
    companionId: string | null,
    message: string,
    role: 'user' | 'assistant'
  ): Promise<void> {
    // Extract different types of memories from the message
    const personalInfo = this.extractPersonalInfo(message);
    const preferences = this.extractPreferences(message);
    const emotions = this.extractEmotions(message);
    const facts = this.extractFacts(message);

    // Store personal information
    for (const info of personalInfo) {
      await this.storeMemory(
        userId,
        companionId,
        'personal',
        info.content,
        { source: 'conversation', role },
        info.importance,
        info.tags
      );
    }

    // Store preferences
    for (const pref of preferences) {
      await this.storeMemory(
        userId,
        companionId,
        'preference',
        pref.content,
        { source: 'conversation', role },
        pref.importance,
        pref.tags
      );
    }

    // Store relationship dynamics if companion message
    if (companionId && (emotions.length > 0 || role === 'assistant')) {
      await this.storeMemory(
        userId,
        companionId,
        'relationship',
        `Conversation interaction: ${message.substring(0, 200)}...`,
        { emotions, role, timestamp: new Date() },
        3,
        ['interaction', ...emotions.map(e => e.type)]
      );
    }
  }

  private calculateRelevanceScore(memory: Memory, query: string): number {
    const queryLower = query.toLowerCase();
    const contentLower = memory.content.toLowerCase();
    
    // Simple keyword matching - in production, use semantic similarity
    const keywords = queryLower.split(' ').filter(word => word.length > 2);
    let score = 0;

    keywords.forEach(keyword => {
      if (contentLower.includes(keyword)) {
        score += 0.3;
      }
    });

    // Boost score based on importance and recency
    score *= (memory.importance / 10);
    
    const daysSinceCreated = (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0.1, 1 - (daysSinceCreated / 365));
    score *= recencyBoost;

    return Math.min(score, 1);
  }

  private extractTopics(messages: any[]): string[] {
    // Extract main topics from recent messages
    // This is a simplified implementation
    const topics = new Set<string>();
    
    messages.forEach(msg => {
      const words = msg.content?.toLowerCase().split(' ') || [];
      // Add logic to identify topic keywords
    });

    return Array.from(topics);
  }

  private detectMood(messages: any[]): string | undefined {
    // Analyze recent messages for mood indicators
    // This is a simplified implementation
    if (messages.length === 0) return undefined;

    const recentContent = messages.slice(-3).map(m => m.content).join(' ').toLowerCase();
    
    if (recentContent.includes('excited') || recentContent.includes('happy')) return 'positive';
    if (recentContent.includes('sad') || recentContent.includes('frustrated')) return 'negative';
    if (recentContent.includes('curious') || recentContent.includes('wondering')) return 'inquisitive';
    
    return 'neutral';
  }

  private analyzeRelationship(memories: Memory[]): any {
    // Analyze relationship dynamics from memories
    return {
      closeness: memories.length > 20 ? 'close' : memories.length > 5 ? 'developing' : 'new',
      commonInterests: this.findCommonInterests(memories),
      communicationStyle: this.analyzeCommunicationStyle(memories)
    };
  }

  private consolidatePreferences(memories: Memory[]): any {
    const preferences: any = {};
    
    memories.forEach(memory => {
      if (memory.context?.preferenceType) {
        preferences[memory.context.preferenceType] = memory.content;
      }
    });

    return preferences;
  }

  private findCommonInterests(memories: Memory[]): string[] {
    // Extract common interests from memories
    const interests = new Set<string>();
    
    memories.forEach(memory => {
      memory.tags.forEach(tag => {
        if (tag.startsWith('interest:')) {
          interests.add(tag.substring(9));
        }
      });
    });

    return Array.from(interests);
  }

  private analyzeCommunicationStyle(memories: Memory[]): string {
    // Analyze communication patterns
    return memories.length > 10 ? 'established' : 'developing';
  }

  private extractPersonalInfo(message: string): Array<{ content: string; importance: number; tags: string[] }> {
    // Extract personal information from message
    // This is a simplified implementation - in production, use NLP
    const info: Array<{ content: string; importance: number; tags: string[] }> = [];
    
    // Look for age mentions
    const ageMatch = message.match(/i am (\d+)|i'm (\d+)|age (\d+)/i);
    if (ageMatch) {
      const age = ageMatch[1] || ageMatch[2] || ageMatch[3];
      info.push({
        content: `User is ${age} years old`,
        importance: 7,
        tags: ['personal', 'age']
      });
    }

    // Look for occupation mentions
    const jobMatch = message.match(/i work as|i'm a|i am a|my job/i);
    if (jobMatch) {
      info.push({
        content: `Career information: ${message}`,
        importance: 6,
        tags: ['personal', 'career']
      });
    }

    return info;
  }

  private extractPreferences(message: string): Array<{ content: string; importance: number; tags: string[] }> {
    const preferences: Array<{ content: string; importance: number; tags: string[] }> = [];
    
    // Look for preference indicators
    const likeMatch = message.match(/i like|i love|i enjoy|i prefer/i);
    if (likeMatch) {
      preferences.push({
        content: message,
        importance: 5,
        tags: ['preference', 'likes']
      });
    }

    const dislikeMatch = message.match(/i hate|i dislike|i don't like/i);
    if (dislikeMatch) {
      preferences.push({
        content: message,
        importance: 6,
        tags: ['preference', 'dislikes']
      });
    }

    return preferences;
  }

  private extractEmotions(message: string): Array<{ type: string; intensity: number }> {
    const emotions: Array<{ type: string; intensity: number }> = [];
    
    const emotionWords = {
      happy: ['happy', 'joy', 'excited', 'thrilled', 'delighted'],
      sad: ['sad', 'depressed', 'down', 'melancholy'],
      angry: ['angry', 'furious', 'mad', 'irritated'],
      anxious: ['anxious', 'worried', 'nervous', 'stressed'],
      curious: ['curious', 'interested', 'wondering']
    };

    const messageLower = message.toLowerCase();
    
    Object.entries(emotionWords).forEach(([emotion, words]) => {
      words.forEach(word => {
        if (messageLower.includes(word)) {
          emotions.push({ type: emotion, intensity: 1 });
        }
      });
    });

    return emotions;
  }

  private extractFacts(message: string): Array<{ content: string; importance: number; tags: string[] }> {
    // Extract factual information that should be remembered
    // This is a simplified implementation
    return [];
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private async saveToDatabase(userId: string, companionId: string | null, memory: Memory): Promise<void> {
    try {
      // Generate embedding for the memory content
      const embedding = await vectorService.generateEmbedding(memory.content);
      
      // Save to database with vector embedding
      await prisma.memory.create({
        data: {
          id: memory.id,
          type: memory.type,
          content: memory.content,
          // embedding: embedding, // This will work once pgvector is enabled
          context: memory.context,
          importance: memory.importance,
          tags: memory.tags,
          userId,
          companionId,
          lastAccessed: memory.lastAccessed,
          createdAt: memory.createdAt
        }
      });
    } catch (error) {
      console.error('Error saving memory to database:', error);
    }
  }
}