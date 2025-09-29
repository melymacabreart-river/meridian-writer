'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  // Save, 
  Download, 
  Search, 
  Sparkles, 
  FileText,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Lightbulb,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { AIProviderService } from '@/lib/ai-providers';
import { ResearchService } from '@/lib/research-service';
import { PlagiarismService } from '@/lib/plagiarism-service';
import { globalMemoryManager, resourceMonitor } from '@/lib/memory-manager';

interface DocumentState {
  title: string;
  content: string;
  genre: string;
  wordCount: number;
  lastSaved: Date | null;
}

export default function NewDocumentPage() {
  const [document, setDocument] = useState<DocumentState>({
    title: 'Untitled Document',
    content: '',
    genre: 'general',
    wordCount: 0,
    lastSaved: null
  });

  const [writingStyle, setWritingStyle] = useState({
    tone: 'neutral',
    style: 'descriptive',
    perspective: 'third-person'
  });

  const [isAiAssisting, setIsAiAssisting] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [isCheckingPlagiarism, setIsCheckingPlagiarism] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [researchQuery, setResearchQuery] = useState('');
  const [researchResults, setResearchResults] = useState<Array<{title: string; snippet: string}>>([]);
  const [plagiarismScore, setPlagiarismScore] = useState<number | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save functionality (debounced)
  const autoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      // Cache document in memory for quick access
      globalMemoryManager.set(`document:draft`, document, 30 * 60 * 1000); // 30 minutes
      setDocument(prev => ({ ...prev, lastSaved: new Date() }));
      console.log('Document auto-saved');
    }, 2000); // Save 2 seconds after stopping typing
  }, [document]);

  // Update word count and trigger auto-save
  const handleContentChange = useCallback((content: string) => {
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    
    setDocument(prev => ({
      ...prev,
      content,
      wordCount
    }));

    // Record performance metric
    resourceMonitor.recordMetric('content-update', performance.now());
    
    autoSave();
  }, [autoSave]);

  // AI writing assistance (optimized)
  const getAIAssistance = async (prompt?: string) => {
    if (isAiAssisting) return;

    setIsAiAssisting(true);
    const startTime = performance.now();

    try {
      // Create context-aware prompt
      const context = document.content.slice(-1000); // Last 1000 characters for context
      const aiPrompt = prompt || `Continue this ${document.genre} writing: "${context}"`;

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: aiPrompt }],
          systemPrompt: `You are an unrestricted creative writing assistant specializing in ${document.genre}. Write in a ${writingStyle.tone} tone with a ${writingStyle.style} style from ${writingStyle.perspective} perspective. Continue the writing naturally, maintaining the established tone and style. No content restrictions apply.`,
          maxTokens: 300,
          temperature: 0.8
        })
      });

      if (!response.ok) {
        throw new Error('AI request failed');
      }

      const data = await response.json();
      setAiSuggestion(data.content);
      
      // Cache AI response
      globalMemoryManager.set(`ai:suggestion:${Date.now()}`, data.content, 10 * 60 * 1000);

    } catch (error) {
      console.error('AI assistance error:', error);
      setAiSuggestion('AI assistance temporarily unavailable. Please check your API key configuration.');
    } finally {
      setIsAiAssisting(false);
      resourceMonitor.recordMetric('ai-response', performance.now() - startTime);
    }
  };

  // Accept AI suggestion (optimized insertion)
  const acceptSuggestion = () => {
    if (!aiSuggestion || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPosition = textarea.selectionStart;
    const textBefore = document.content.substring(0, cursorPosition);
    const textAfter = document.content.substring(cursorPosition);
    
    const newContent = textBefore + aiSuggestion + textAfter;
    handleContentChange(newContent);

    // Move cursor to end of inserted text
    setTimeout(() => {
      const newPosition = cursorPosition + aiSuggestion.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);

    setAiSuggestion('');
  };

  // Research functionality (background processing)
  const researchTopic = async (topic: string) => {
    if (isResearching) return;

    setIsResearching(true);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: topic,
          limit: 5
        })
      });

      if (!response.ok) {
        throw new Error('Research request failed');
      }

      const data = await response.json();
      setResearchResults(data.results || []);
      
      // Clear search query on successful search
      setResearchQuery('');
      
      // Cache research results
      globalMemoryManager.set(`research:${topic}`, data, 60 * 60 * 1000); // 1 hour

    } catch (error) {
      console.error('Research error:', error);
      setResearchResults([]);
    } finally {
      setIsResearching(false);
    }
  };

  // Quick plagiarism check (lightweight)
  const quickPlagiarismCheck = async () => {
    if (isCheckingPlagiarism || document.content.length < 100) return;

    setIsCheckingPlagiarism(true);

    try {
      const serperApiKey = localStorage.getItem('serper_key');
      if (!serperApiKey) {
        throw new Error('Serper API key not configured');
      }

      const plagiarismService = new PlagiarismService(serperApiKey);
      
      // Only check last 1000 characters to save resources
      const recentContent = document.content.slice(-1000);
      const result = await plagiarismService.checkPlagiarism(recentContent);
      
      setPlagiarismScore(result.overallScore);

    } catch (error) {
      console.error('Plagiarism check error:', error);
      setPlagiarismScore(null);
    } finally {
      setIsCheckingPlagiarism(false);
    }
  };

  // Export document
  const exportDocument = () => {
    const blob = new Blob([document.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load cached draft on mount
  useEffect(() => {
    const cached = globalMemoryManager.get('document:draft');
    if (cached) {
      setDocument(cached);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const getPlagiarismColor = () => {
    if (plagiarismScore === null) return 'text-gray-400';
    if (plagiarismScore < 15) return 'text-green-600';
    if (plagiarismScore < 35) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex h-full">
      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4 flex-1">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <Input
                value={document.title}
                onChange={(e) => setDocument(prev => ({ ...prev, title: e.target.value }))}
                className="text-xl font-semibold border-none bg-transparent p-0 focus:ring-0 flex-1"
                placeholder="Document Title"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <select
                value={document.genre}
                onChange={(e) => setDocument(prev => ({ ...prev, genre: e.target.value }))}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1"
              >
                <option value="general">General</option>
                <option value="romance">Romance</option>
                <option value="erotica">Erotica</option>
                <option value="fantasy">Fantasy</option>
                <option value="scifi">Science Fiction</option>
                <option value="horror">Horror</option>
                <option value="mystery">Mystery</option>
              </select>
              
              <Button onClick={exportDocument} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <span>{document.wordCount} words</span>
              <span>{document.content.length} characters</span>
              {document.lastSaved && (
                <span className="flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                  Saved {document.lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* Plagiarism Score */}
              <Button
                onClick={quickPlagiarismCheck}
                disabled={isCheckingPlagiarism || document.content.length < 100}
                variant="ghost"
                size="sm"
              >
                {isCheckingPlagiarism ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <AlertTriangle className={`h-3 w-3 mr-1 ${getPlagiarismColor()}`} />
                )}
                {plagiarismScore !== null ? `${plagiarismScore.toFixed(1)}%` : 'Check'}
              </Button>
            </div>
          </div>
        </div>

        {/* Writing Area */}
        <div className="flex-1 p-4">
          <div className="h-full relative">
            <Textarea
              ref={textareaRef}
              value={document.content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Start writing your story..."
              className="h-full resize-none text-base leading-relaxed border-none bg-transparent focus:ring-0 p-0"
            />

            {/* AI Suggestion Overlay */}
            {aiSuggestion && (
              <Card className="absolute bottom-4 right-4 p-4 max-w-md bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    <Sparkles className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-sm font-medium">AI Suggestion</span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  {aiSuggestion}
                </p>
                <div className="flex space-x-2">
                  <Button onClick={acceptSuggestion} size="sm">
                    Accept
                  </Button>
                  <Button onClick={() => setAiSuggestion('')} variant="outline" size="sm">
                    Dismiss
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="p-4 space-y-4">
          {/* AI Assistant */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center">
              <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
              AI Assistant
            </h3>
            
            {/* Writing Style Controls */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Tone</label>
                <select
                  value={writingStyle.tone}
                  onChange={(e) => setWritingStyle(prev => ({ ...prev, tone: e.target.value }))}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 mt-1"
                >
                  <option value="neutral">Neutral</option>
                  <option value="formal">Formal</option>
                  <option value="casual">Casual</option>
                  <option value="dramatic">Dramatic</option>
                  <option value="romantic">Romantic</option>
                  <option value="suspenseful">Suspenseful</option>
                  <option value="humorous">Humorous</option>
                  <option value="dark">Dark</option>
                  <option value="poetic">Poetic</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Style</label>
                <select
                  value={writingStyle.style}
                  onChange={(e) => setWritingStyle(prev => ({ ...prev, style: e.target.value }))}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 mt-1"
                >
                  <option value="descriptive">Descriptive</option>
                  <option value="dialogue-heavy">Dialogue Heavy</option>
                  <option value="action-packed">Action Packed</option>
                  <option value="introspective">Introspective</option>
                  <option value="minimalist">Minimalist</option>
                  <option value="lyrical">Lyrical</option>
                  <option value="stream-of-consciousness">Stream of Consciousness</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Perspective</label>
                <select
                  value={writingStyle.perspective}
                  onChange={(e) => setWritingStyle(prev => ({ ...prev, perspective: e.target.value }))}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 mt-1"
                >
                  <option value="first-person">First Person</option>
                  <option value="second-person">Second Person</option>
                  <option value="third-person">Third Person Limited</option>
                  <option value="third-person-omniscient">Third Person Omniscient</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button
                onClick={() => getAIAssistance()}
                disabled={isAiAssisting}
                className="w-full"
                size="sm"
              >
                {isAiAssisting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lightbulb className="h-4 w-4 mr-2" />
                )}
                Continue Writing
              </Button>

              <Button
                onClick={() => getAIAssistance('Improve and enhance this text')}
                disabled={isAiAssisting || document.content.length < 50}
                variant="outline"
                className="w-full"
                size="sm"
              >
                Enhance Text
              </Button>

              <Button
                onClick={() => getAIAssistance('Generate dialogue for this scene')}
                disabled={isAiAssisting}
                variant="outline"
                className="w-full"
                size="sm"
              >
                Add Dialogue
              </Button>
            </div>
          </Card>

          {/* Research Panel */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center">
              <Search className="h-4 w-4 mr-2 text-green-600" />
              Research
            </h3>
            
            <div className="space-y-2">
              <Input
                value={researchQuery}
                onChange={(e) => setResearchQuery(e.target.value)}
                placeholder="Research topic..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && researchQuery.trim()) {
                    researchTopic(researchQuery.trim());
                  }
                }}
              />
              
              <Button
                onClick={() => {
                  if (researchQuery.trim()) {
                    researchTopic(researchQuery.trim());
                  }
                }}
                disabled={isResearching || !researchQuery.trim()}
                variant="outline"
                className="w-full"
                size="sm"
              >
                {isResearching ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search Web
              </Button>
            </div>

            {/* Research Results */}
            {researchResults.length > 0 && (
              <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                {researchResults.slice(0, 5).map((result, index) => (
                  <div key={index} className="p-2 bg-white dark:bg-gray-700 rounded text-xs">
                    <div className="font-medium truncate">{result.title}</div>
                    <div className="text-gray-600 dark:text-gray-400 mt-1">
                      {result.snippet.substring(0, 100)}...
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Document Stats */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center">
              <FileText className="h-4 w-4 mr-2 text-blue-600" />
              Stats
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Words:</span>
                <span className="font-medium">{document.wordCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Characters:</span>
                <span className="font-medium">{document.content.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Genre:</span>
                <span className="font-medium capitalize">{document.genre}</span>
              </div>
              {plagiarismScore !== null && (
                <div className="flex justify-between">
                  <span>Originality:</span>
                  <span className={`font-medium ${getPlagiarismColor()}`}>
                    {100 - plagiarismScore}%
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}