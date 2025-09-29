// Lightweight Google Drive integration optimized for minimal resource usage
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: number;
  content?: string;
}

export interface DriveCache {
  files: Map<string, DriveFile>;
  content: Map<string, string>;
  lastUpdate: Map<string, number>;
}

export class GoogleDriveLite {
  private cache: DriveCache = {
    files: new Map(),
    content: new Map(),
    lastUpdate: new Map()
  };
  
  private accessToken: string | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 50; // Limit cached files to prevent memory issues

  constructor() {
    // Clean up cache periodically
    setInterval(() => this.cleanupCache(), 10 * 60 * 1000); // Every 10 minutes
  }

  // Set access token from OAuth
  setAccessToken(token: string) {
    this.accessToken = token;
  }

  // Get OAuth URL (client-side only)
  getAuthUrl(): string {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = window.location.origin + '/auth/google/callback';
    const scope = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents.readonly';
    
    return `https://accounts.google.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&access_type=offline`;
  }

  // List Google Docs (cached and paginated)
  async listGoogleDocs(limit: number = 10): Promise<DriveFile[]> {
    if (!this.accessToken) throw new Error('Not authenticated');

    const cacheKey = `docs_${limit}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.document' and trashed=false&pageSize=${limit}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch documents');

      const data = await response.json();
      const files: DriveFile[] = data.files.map((file: any) => ({
        id: file.id,
        name: file.name,
        mimeType: 'application/vnd.google-apps.document',
        modifiedTime: file.modifiedTime,
        size: file.size ? parseInt(file.size) : undefined
      }));

      this.setCachedData(cacheKey, files);
      return files;
    } catch (error) {
      console.error('Error listing docs:', error);
      throw error;
    }
  }

  // Get document content (cached and optimized)
  async getDocumentContent(documentId: string): Promise<string> {
    if (!this.accessToken) throw new Error('Not authenticated');

    const cached = this.cache.content.get(documentId);
    const lastUpdate = this.cache.lastUpdate.get(documentId);
    
    if (cached && lastUpdate && Date.now() - lastUpdate < this.CACHE_DURATION) {
      return cached;
    }

    try {
      // Use the simpler export API instead of the full Docs API for better performance
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${documentId}/export?mimeType=text/plain`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch document content');

      const content = await response.text();
      
      // Cache with size limit
      if (this.cache.content.size >= this.MAX_CACHE_SIZE) {
        const oldestKey = Array.from(this.cache.lastUpdate.entries())
          .sort((a, b) => a[1] - b[1])[0][0];
        this.cache.content.delete(oldestKey);
        this.cache.lastUpdate.delete(oldestKey);
      }

      this.cache.content.set(documentId, content);
      this.cache.lastUpdate.set(documentId, Date.now());
      
      return content;
    } catch (error) {
      console.error('Error fetching document:', error);
      throw error;
    }
  }

  // Search documents (lightweight)
  async searchDocuments(query: string, limit: number = 5): Promise<DriveFile[]> {
    if (!this.accessToken) throw new Error('Not authenticated');

    try {
      const encodedQuery = encodeURIComponent(`name contains '${query}' and mimeType='application/vnd.google-apps.document' and trashed=false`);
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodedQuery}&pageSize=${limit}&fields=files(id,name,modifiedTime)&orderBy=relevance desc`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to search documents');

      const data = await response.json();
      return data.files.map((file: any) => ({
        id: file.id,
        name: file.name,
        mimeType: 'application/vnd.google-apps.document',
        modifiedTime: file.modifiedTime
      }));
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  // Get multiple documents for plagiarism checking (optimized batch processing)
  async getMultipleDocuments(documentIds: string[]): Promise<Array<{id: string, content: string, name: string}>> {
    const results = [];
    const batchSize = 3; // Process in small batches to avoid overwhelming the system

    for (let i = 0; i < documentIds.length; i += batchSize) {
      const batch = documentIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (id) => {
        try {
          const content = await this.getDocumentContent(id);
          const files = await this.listGoogleDocs(100); // Use cached version
          const file = files.find(f => f.id === id);
          
          return {
            id,
            content: content.substring(0, 5000), // Limit content size for memory efficiency
            name: file?.name || 'Unknown'
          };
        } catch (error) {
          console.error(`Error processing document ${id}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(Boolean));

      // Small delay between batches to prevent rate limiting
      if (i + batchSize < documentIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results as Array<{id: string, content: string, name: string}>;
  }

  // Import document for editing (lightweight)
  async importDocument(documentId: string): Promise<{ title: string; content: string; metadata: any }> {
    if (!this.accessToken) throw new Error('Not authenticated');

    try {
      const [content, fileInfo] = await Promise.all([
        this.getDocumentContent(documentId),
        this.getFileInfo(documentId)
      ]);

      return {
        title: fileInfo.name,
        content,
        metadata: {
          modifiedTime: fileInfo.modifiedTime,
          googleDocId: documentId,
          size: fileInfo.size
        }
      };
    } catch (error) {
      console.error('Error importing document:', error);
      throw error;
    }
  }

  // Check authentication status (lightweight)
  async checkAuth(): Promise<boolean> {
    if (!this.accessToken) return false;

    try {
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/about?fields=user',
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Lightweight writing analysis (only on recent documents)
  async analyzeRecentWriting(limit: number = 5): Promise<{
    averageWordCount: number;
    commonWords: string[];
    recentTopics: string[];
    writingFrequency: number;
  }> {
    try {
      const recentDocs = await this.listGoogleDocs(limit);
      const contents = await Promise.all(
        recentDocs.slice(0, 3).map(doc => // Only analyze first 3 to save resources
          this.getDocumentContent(doc.id).catch(() => '')
        )
      );

      const validContents = contents.filter(content => content.length > 0);
      
      if (validContents.length === 0) {
        return {
          averageWordCount: 0,
          commonWords: [],
          recentTopics: [],
          writingFrequency: 0
        };
      }

      const totalWords = validContents.reduce((acc, content) => 
        acc + content.split(/\s+/).length, 0);
      
      const averageWordCount = Math.round(totalWords / validContents.length);

      // Simple word frequency analysis (limited to save memory)
      const allWords = validContents.join(' ').toLowerCase()
        .replace(/[^\w\s]/g, '').split(/\s+/)
        .filter(word => word.length > 3);

      const wordCounts = new Map<string, number>();
      allWords.forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });

      const commonWords = Array.from(wordCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);

      const recentTopics = this.extractSimpleTopics(validContents[0] || '');

      return {
        averageWordCount,
        commonWords,
        recentTopics,
        writingFrequency: recentDocs.length
      };
    } catch (error) {
      console.error('Error analyzing writing:', error);
      return {
        averageWordCount: 0,
        commonWords: [],
        recentTopics: [],
        writingFrequency: 0
      };
    }
  }

  // Helper methods
  private getCachedData(key: string): any {
    const lastUpdate = this.cache.lastUpdate.get(key);
    if (lastUpdate && Date.now() - lastUpdate < this.CACHE_DURATION) {
      return this.cache.files.get(key);
    }
    return null;
  }

  private setCachedData(key: string, data: any) {
    this.cache.files.set(key, data);
    this.cache.lastUpdate.set(key, Date.now());
  }

  private async getFileInfo(fileId: string): Promise<DriveFile> {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,modifiedTime,size`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    if (!response.ok) throw new Error('Failed to get file info');
    
    const data = await response.json();
    return {
      id: data.id,
      name: data.name,
      mimeType: 'application/vnd.google-apps.document',
      modifiedTime: data.modifiedTime,
      size: data.size ? parseInt(data.size) : undefined
    };
  }

  private extractSimpleTopics(content: string): string[] {
    const words = content.toLowerCase().split(/\s+/)
      .filter(word => word.length > 5)
      .slice(0, 100); // Limit processing to save resources

    const wordCounts = new Map<string, number>();
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });

    return Array.from(wordCounts.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private cleanupCache() {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Find expired entries
    this.cache.lastUpdate.forEach((timestamp, key) => {
      if (now - timestamp > this.CACHE_DURATION * 2) { // Keep cache for 2x duration
        expiredKeys.push(key);
      }
    });

    // Remove expired entries
    expiredKeys.forEach(key => {
      this.cache.files.delete(key);
      this.cache.content.delete(key);
      this.cache.lastUpdate.delete(key);
    });

    console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
  }

  // Get cache stats for monitoring
  getCacheStats() {
    return {
      filesCount: this.cache.files.size,
      contentCount: this.cache.content.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private estimateMemoryUsage(): number {
    let size = 0;
    this.cache.content.forEach(content => {
      size += content.length * 2; // Rough estimate: 2 bytes per character
    });
    return size;
  }
}