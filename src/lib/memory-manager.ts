// Efficient memory management and caching system for optimal performance
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  size: number;
  accessCount: number;
  lastAccess: number;
}

export interface MemoryStats {
  totalSize: number;
  entryCount: number;
  hitRate: number;
  memoryUsage: string;
}

export class MemoryManager {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB max cache size
  private readonly MAX_ENTRIES = 1000;
  private readonly DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes
  
  private hits = 0;
  private misses = 0;
  private currentSize = 0;

  constructor() {
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
    
    // Monitor memory usage every minute
    setInterval(() => this.monitorMemory(), 60 * 1000);
  }

  // Set cache entry with automatic size calculation
  set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): void {
    const size = this.calculateSize(value);
    
    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.currentSize -= existing.size;
    }

    // Check if we need to make space
    if (this.currentSize + size > this.MAX_CACHE_SIZE || this.cache.size >= this.MAX_ENTRIES) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      size,
      accessCount: 0,
      lastAccess: Date.now()
    };

    this.cache.set(key, entry);
    this.currentSize += size;
  }

  // Get cache entry with LRU tracking
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > this.DEFAULT_TTL) {
      this.delete(key);
      this.misses++;
      return null;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccess = now;
    this.hits++;

    return entry.data as T;
  }

  // Check if key exists and is valid
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > this.DEFAULT_TTL) {
      this.delete(key);
      return false;
    }

    return true;
  }

  // Delete cache entry
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      this.cache.delete(key);
      return true;
    }
    return false;
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
    this.hits = 0;
    this.misses = 0;
  }

  // Get memory statistics
  getStats(): MemoryStats {
    const hitRate = this.hits + this.misses > 0 ? (this.hits / (this.hits + this.misses)) * 100 : 0;
    
    return {
      totalSize: this.currentSize,
      entryCount: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: this.formatBytes(this.currentSize)
    };
  }

  // Evict least recently used entries
  private evictLRU(): void {
    if (this.cache.size === 0) return;

    // Sort entries by last access time (oldest first)
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    // Remove oldest entries until we're under limits
    let removed = 0;
    for (const [key, entry] of entries) {
      if (this.currentSize <= this.MAX_CACHE_SIZE * 0.8 && this.cache.size <= this.MAX_ENTRIES * 0.8) {
        break;
      }
      
      this.currentSize -= entry.size;
      this.cache.delete(key);
      removed++;
    }

    console.log(`Evicted ${removed} LRU entries`);
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    const expired: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.DEFAULT_TTL) {
        expired.push(key);
      }
    });

    expired.forEach(key => this.delete(key));
    
    if (expired.length > 0) {
      console.log(`Cleaned up ${expired.length} expired cache entries`);
    }
  }

  // Monitor memory usage and trigger cleanup if needed
  private monitorMemory(): void {
    if (this.currentSize > this.MAX_CACHE_SIZE * 0.9) {
      console.warn('Cache approaching memory limit, triggering cleanup');
      this.evictLRU();
    }

    // Log memory stats periodically
    const stats = this.getStats();
    if (stats.entryCount > 0) {
      console.log(`Cache stats: ${stats.entryCount} entries, ${stats.memoryUsage}, ${stats.hitRate}% hit rate`);
    }
  }

  // Calculate size of cached object
  private calculateSize(obj: any): number {
    if (obj === null || obj === undefined) return 0;
    
    if (typeof obj === 'string') return obj.length * 2; // 2 bytes per character
    if (typeof obj === 'number') return 8;
    if (typeof obj === 'boolean') return 4;
    
    if (Array.isArray(obj)) {
      return obj.reduce((size, item) => size + this.calculateSize(item), 0);
    }
    
    if (typeof obj === 'object') {
      return Object.keys(obj).reduce((size, key) => {
        return size + key.length * 2 + this.calculateSize(obj[key]);
      }, 0);
    }
    
    return 100; // Default size for unknown types
  }

  // Format bytes to human readable format
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Optimized conversation memory manager
export class ConversationMemoryManager {
  private memoryManager: MemoryManager;
  private readonly MAX_CONVERSATION_LENGTH = 20; // Keep last 20 messages
  private readonly SUMMARY_THRESHOLD = 50; // Summarize after 50 messages

  constructor(memoryManager: MemoryManager) {
    this.memoryManager = memoryManager;
  }

  // Store conversation with automatic pruning
  storeConversation(conversationId: string, messages: any[]): void {
    // Keep only recent messages to save memory
    const recentMessages = messages.slice(-this.MAX_CONVERSATION_LENGTH);
    
    // Create conversation summary if too long
    let summary = null;
    if (messages.length > this.SUMMARY_THRESHOLD) {
      summary = this.createConversationSummary(messages.slice(0, -this.MAX_CONVERSATION_LENGTH));
    }

    const conversationData = {
      messages: recentMessages,
      summary,
      totalMessages: messages.length,
      lastUpdate: Date.now()
    };

    this.memoryManager.set(`conversation:${conversationId}`, conversationData, 30 * 60 * 1000); // 30 minutes TTL
  }

  // Retrieve conversation with summary
  getConversation(conversationId: string): { messages: any[], summary?: string, totalMessages: number } | null {
    return this.memoryManager.get(`conversation:${conversationId}`);
  }

  // Create concise summary of old messages
  private createConversationSummary(oldMessages: any[]): string {
    const topics = new Set<string>();
    const keyPoints: string[] = [];

    oldMessages.forEach(msg => {
      if (msg.role === 'user') {
        // Extract key topics from user messages
        const words = msg.content.toLowerCase().split(/\s+/);
        words.filter(word => word.length > 5).forEach(word => topics.add(word));
      }
      
      // Keep important or emotional messages
      if (msg.importance > 7 || (msg.emotion && msg.emotion !== 'neutral')) {
        keyPoints.push(msg.content.substring(0, 100));
      }
    });

    return `Previous conversation covered: ${Array.from(topics).slice(0, 10).join(', ')}. Key moments: ${keyPoints.slice(0, 3).join('; ')}`;
  }
}

// Resource monitor for performance tracking
export class ResourceMonitor {
  private performanceEntries: PerformanceEntry[] = [];
  private readonly MAX_ENTRIES = 100;

  constructor() {
    // Monitor performance periodically
    if (typeof window !== 'undefined' && 'performance' in window) {
      setInterval(() => this.collectMetrics(), 30 * 1000); // Every 30 seconds
    }
  }

  // Record performance metric
  recordMetric(name: string, value: number, type: 'duration' | 'memory' | 'count' = 'duration'): void {
    const entry = {
      name,
      entryType: type,
      startTime: Date.now(),
      duration: value
    } as PerformanceEntry;

    this.performanceEntries.push(entry);
    
    // Keep only recent entries
    if (this.performanceEntries.length > this.MAX_ENTRIES) {
      this.performanceEntries = this.performanceEntries.slice(-this.MAX_ENTRIES);
    }
  }

  // Get performance summary
  getPerformanceSummary(): {
    averageResponseTime: number;
    memoryUsage: number;
    slowOperations: string[];
  } {
    const responseTimeEntries = this.performanceEntries.filter(e => e.name.includes('response'));
    const averageResponseTime = responseTimeEntries.length > 0 
      ? responseTimeEntries.reduce((sum, e) => sum + e.duration, 0) / responseTimeEntries.length 
      : 0;

    const memoryInfo = (performance as any).memory;
    const memoryUsage = memoryInfo ? memoryInfo.usedJSHeapSize : 0;

    const slowOperations = this.performanceEntries
      .filter(e => e.duration > 1000) // Operations taking more than 1 second
      .map(e => `${e.name}: ${e.duration}ms`)
      .slice(-5); // Last 5 slow operations

    return {
      averageResponseTime: Math.round(averageResponseTime),
      memoryUsage: Math.round(memoryUsage / 1024 / 1024), // MB
      slowOperations
    };
  }

  // Collect browser performance metrics
  private collectMetrics(): void {
    if (typeof window === 'undefined') return;

    // Collect navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      this.recordMetric('page-load', navigation.loadEventEnd - navigation.fetchStart);
    }

    // Collect memory usage
    const memoryInfo = (performance as any).memory;
    if (memoryInfo) {
      this.recordMetric('memory-used', memoryInfo.usedJSHeapSize, 'memory');
      this.recordMetric('memory-total', memoryInfo.totalJSHeapSize, 'memory');
    }
  }

  // Check if system is under stress
  isSystemStressed(): boolean {
    const summary = this.getPerformanceSummary();
    return summary.averageResponseTime > 2000 || // Responses taking more than 2 seconds
           summary.memoryUsage > 500 || // Using more than 500MB
           summary.slowOperations.length > 3; // More than 3 recent slow operations
  }
}

// Global memory manager instance
export const globalMemoryManager = new MemoryManager();
export const conversationMemoryManager = new ConversationMemoryManager(globalMemoryManager);
export const resourceMonitor = new ResourceMonitor();