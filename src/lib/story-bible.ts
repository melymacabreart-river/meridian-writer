import { storyBibleService, VectorMemory } from './vector-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface Character {
  id: string;
  name: string;
  age?: number;
  appearance: string;
  personality: string;
  background: string;
  motivations: string[];
  relationships: { [characterId: string]: string };
  arcTemplate?: 'hero' | 'mentor' | 'threshold_guardian' | 'herald' | 'shapeshifter' | 'shadow' | 'ally';
  notes: string;
  tags: string[];
}

export interface PlotPoint {
  id: string;
  title: string;
  description: string;
  chapter?: number;
  act?: number;
  type: 'inciting_incident' | 'plot_point_1' | 'midpoint' | 'plot_point_2' | 'climax' | 'resolution' | 'character_moment' | 'world_building';
  charactersInvolved: string[];
  consequences: string[];
  foreshadowing: string[];
  notes: string;
  order: number;
}

export interface WorldElement {
  id: string;
  name: string;
  type: 'location' | 'culture' | 'organization' | 'magic_system' | 'technology' | 'history' | 'language';
  description: string;
  significance: string;
  connections: string[]; // IDs of related elements
  rules: string[]; // For magic systems, tech, etc.
  history: string;
  notes: string;
}

export interface Theme {
  id: string;
  name: string;
  statement: string;
  symbolism: string[];
  howExplored: string;
  characterArcs: string[]; // Character IDs that explore this theme
  scenes: string[]; // Scene/chapter references
  notes: string;
}

export interface StoryBible {
  id: string;
  documentId: string;
  premise: string;
  genre: string[];
  tone: string;
  targetAudience: string;
  characters: Character[];
  plotPoints: PlotPoint[];
  worldElements: WorldElement[];
  themes: Theme[];
  writingStyle: {
    voiceNotes: string;
    pov: string;
    tense: string;
    styleGuides: string[];
  };
  continuityNotes: string[];
  researchNotes: string[];
  lastUpdated: Date;
}

export class StoryBibleManager {
  private static instance: StoryBibleManager;
  
  static getInstance(): StoryBibleManager {
    if (!StoryBibleManager.instance) {
      StoryBibleManager.instance = new StoryBibleManager();
    }
    return StoryBibleManager.instance;
  }

  async createStoryBible(documentId: string, userId: string, initialData?: Partial<StoryBible>): Promise<StoryBible> {
    const storyBible: StoryBible = {
      id: this.generateId(),
      documentId,
      premise: initialData?.premise || '',
      genre: initialData?.genre || [],
      tone: initialData?.tone || '',
      targetAudience: initialData?.targetAudience || '',
      characters: initialData?.characters || [],
      plotPoints: initialData?.plotPoints || [],
      worldElements: initialData?.worldElements || [],
      themes: initialData?.themes || [],
      writingStyle: initialData?.writingStyle || {
        voiceNotes: '',
        pov: 'third_limited',
        tense: 'past',
        styleGuides: []
      },
      continuityNotes: initialData?.continuityNotes || [],
      researchNotes: initialData?.researchNotes || [],
      lastUpdated: new Date()
    };

    await this.saveStoryBible(storyBible, userId);
    return storyBible;
  }

  async getStoryBible(documentId: string): Promise<StoryBible | null> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      });
      
      if (document?.storyBible) {
        return document.storyBible as StoryBible;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching story bible:', error);
      return null;
    }
  }

  async addCharacter(documentId: string, userId: string, character: Omit<Character, 'id'>): Promise<Character> {
    const storyBible = await this.getStoryBible(documentId);
    if (!storyBible) throw new Error('Story bible not found');

    const newCharacter: Character = {
      ...character,
      id: this.generateId()
    };

    storyBible.characters.push(newCharacter);
    storyBible.lastUpdated = new Date();

    // Index character in vector database
    await storyBibleService.indexStoryElement({
      type: 'character',
      name: newCharacter.name,
      description: `${newCharacter.appearance} ${newCharacter.personality}`,
      details: {
        age: newCharacter.age,
        background: newCharacter.background,
        motivations: newCharacter.motivations,
        relationships: newCharacter.relationships,
        arcTemplate: newCharacter.arcTemplate,
        notes: newCharacter.notes
      }
    }, documentId, userId);

    await this.saveStoryBible(storyBible, userId);
    return newCharacter;
  }

  async addPlotPoint(documentId: string, userId: string, plotPoint: Omit<PlotPoint, 'id'>): Promise<PlotPoint> {
    const storyBible = await this.getStoryBible(documentId);
    if (!storyBible) throw new Error('Story bible not found');

    const newPlotPoint: PlotPoint = {
      ...plotPoint,
      id: this.generateId()
    };

    storyBible.plotPoints.push(newPlotPoint);
    storyBible.plotPoints.sort((a, b) => a.order - b.order);
    storyBible.lastUpdated = new Date();

    // Index plot point in vector database
    await storyBibleService.indexStoryElement({
      type: 'plot',
      name: newPlotPoint.title,
      description: newPlotPoint.description,
      details: {
        chapter: newPlotPoint.chapter,
        act: newPlotPoint.act,
        type: newPlotPoint.type,
        charactersInvolved: newPlotPoint.charactersInvolved,
        consequences: newPlotPoint.consequences,
        foreshadowing: newPlotPoint.foreshadowing,
        notes: newPlotPoint.notes
      }
    }, documentId, userId);

    await this.saveStoryBible(storyBible, userId);
    return newPlotPoint;
  }

  async addWorldElement(documentId: string, userId: string, worldElement: Omit<WorldElement, 'id'>): Promise<WorldElement> {
    const storyBible = await this.getStoryBible(documentId);
    if (!storyBible) throw new Error('Story bible not found');

    const newWorldElement: WorldElement = {
      ...worldElement,
      id: this.generateId()
    };

    storyBible.worldElements.push(newWorldElement);
    storyBible.lastUpdated = new Date();

    // Index world element in vector database
    await storyBibleService.indexStoryElement({
      type: 'world',
      name: newWorldElement.name,
      description: newWorldElement.description,
      details: {
        type: newWorldElement.type,
        significance: newWorldElement.significance,
        connections: newWorldElement.connections,
        rules: newWorldElement.rules,
        history: newWorldElement.history,
        notes: newWorldElement.notes
      }
    }, documentId, userId);

    await this.saveStoryBible(storyBible, userId);
    return newWorldElement;
  }

  async findRelevantElements(documentId: string, userId: string, query: string): Promise<{
    characters: Character[];
    plotPoints: PlotPoint[];
    worldElements: WorldElement[];
    themes: Theme[];
  }> {
    const relatedMemories = await storyBibleService.findRelatedStoryElements(
      query,
      documentId,
      userId
    );

    const storyBible = await this.getStoryBible(documentId);
    if (!storyBible) {
      return { characters: [], plotPoints: [], worldElements: [], themes: [] };
    }

    // Filter story bible elements based on vector similarity results
    const relevantIds = new Set(relatedMemories.map(m => 
      m.metadata.tags.find(tag => tag !== 'character' && tag !== 'plot' && tag !== 'world' && tag !== 'theme')
    ).filter(Boolean));

    return {
      characters: storyBible.characters.filter(c => 
        relevantIds.has(c.name.toLowerCase().replace(/\s+/g, '-')) ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.personality.toLowerCase().includes(query.toLowerCase())
      ),
      plotPoints: storyBible.plotPoints.filter(p => 
        relevantIds.has(p.title.toLowerCase().replace(/\s+/g, '-')) ||
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())
      ),
      worldElements: storyBible.worldElements.filter(w => 
        relevantIds.has(w.name.toLowerCase().replace(/\s+/g, '-')) ||
        w.name.toLowerCase().includes(query.toLowerCase()) ||
        w.description.toLowerCase().includes(query.toLowerCase())
      ),
      themes: storyBible.themes.filter(t => 
        t.name.toLowerCase().includes(query.toLowerCase()) ||
        t.statement.toLowerCase().includes(query.toLowerCase())
      )
    };
  }

  async generateContinuityReport(documentId: string, userId: string, newContent: string): Promise<{
    consistencyScore: number;
    warnings: string[];
    suggestions: string[];
    relatedElements: any[];
  }> {
    const consistency = await storyBibleService.maintainStoryConsistency(
      newContent,
      documentId,
      userId
    );

    const relatedElements = await this.findRelevantElements(documentId, userId, newContent);

    const warnings: string[] = [...consistency.conflicts];
    const suggestions: string[] = [...consistency.suggestions];

    // Check for character consistency
    relatedElements.characters.forEach(char => {
      if (newContent.toLowerCase().includes(char.name.toLowerCase())) {
        suggestions.push(`Consider ${char.name}'s personality: ${char.personality.slice(0, 100)}...`);
        suggestions.push(`Remember ${char.name}'s motivations: ${char.motivations.join(', ')}`);
      }
    });

    // Check for world-building consistency
    relatedElements.worldElements.forEach(element => {
      if (newContent.toLowerCase().includes(element.name.toLowerCase())) {
        if (element.rules.length > 0) {
          suggestions.push(`World rules for ${element.name}: ${element.rules.join(', ')}`);
        }
      }
    });

    return {
      consistencyScore: consistency.consistencyScore,
      warnings,
      suggestions,
      relatedElements: [
        ...relatedElements.characters,
        ...relatedElements.plotPoints,
        ...relatedElements.worldElements,
        ...relatedElements.themes
      ]
    };
  }

  private async saveStoryBible(storyBible: StoryBible, userId: string): Promise<void> {
    try {
      await prisma.document.update({
        where: { id: storyBible.documentId },
        data: {
          storyBible: storyBible as any,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error saving story bible:', error);
      throw error;
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const storyBibleManager = StoryBibleManager.getInstance();