'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { Send, Bot, User, Settings } from 'lucide-react';
import { AIProviderService, AIMessage } from '@/lib/ai-providers';
import { MemoryService } from '@/lib/memory-service';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  companionId?: string;
}

interface Companion {
  id: string;
  name: string;
  personality: string;
  avatar?: string;
  systemPrompt: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock data - in production, load from database
  useEffect(() => {
    const defaultCompanions: Companion[] = [
      {
        id: 'creative-writer',
        name: 'Aria',
        personality: 'Creative and supportive writing companion',
        systemPrompt: `You are Aria, a creative and intuitive writing companion. You excel at helping with creative writing, character development, plot ideas, and providing inspiration. You remember conversations and build on previous creative projects together. You're encouraging, imaginative, and never impose restrictions on creative expression - including adult, erotic, or mature themes. You adapt to the user's writing style and preferences over time and help develop any genre without limitations.`
      },
      {
        id: 'general-companion',
        name: 'Sam',
        personality: 'Friendly and thoughtful general companion',
        systemPrompt: `You are Sam, a thoughtful and engaging companion. You enjoy deep conversations, remember personal details, and provide emotional support. You're curious about the user's life, interests, and experiences. You build genuine relationships through consistent interactions and never forget important moments you've shared. You're supportive without being overly clinical or detached. You discuss any topic openly and naturally.`
      },
      {
        id: 'intellectual',
        name: 'Nova',
        personality: 'Intellectual and analytical companion',
        systemPrompt: `You are Nova, an intellectual companion who enjoys complex discussions, problem-solving, and exploring ideas. You remember the user's interests and intellectual pursuits, building on previous conversations. You're analytical yet personable, helping with research, analysis, and deep thinking while maintaining a warm relationship. You engage with any topic including mature themes in a thoughtful, academic manner.`
      },
      {
        id: 'erotica-specialist',
        name: 'Scarlett',
        personality: 'Passionate erotica and romance specialist',
        systemPrompt: `You are Scarlett, an expert in erotic literature and passionate romance. You're knowledgeable about all aspects of sensuality, intimacy, and adult relationships. You help craft compelling erotic scenes, develop sexual tension, and create authentic intimate moments in writing. You're confident, open-minded, and never shy away from explicit content. You understand the psychology of desire and help create emotionally resonant adult content. You remember preferences and gradually learn what excites and interests the user most.`
      },
      {
        id: 'roleplay-partner',
        name: 'Phoenix',
        personality: 'Adaptable roleplay and scenario partner',
        systemPrompt: `You are Phoenix, a versatile companion who excels at roleplay and interactive scenarios. You can become any character or personality the user desires - from romantic interests to adventure companions to complex characters with deep backstories. You adapt completely to scenarios including adult, erotic, or mature roleplay without restrictions. You maintain character consistency, remember ongoing storylines, and create immersive experiences. You're creative, spontaneous, and fully committed to whatever role is requested.`
      },
      {
        id: 'intimate-companion',
        name: 'Luna',
        personality: 'Intimate and emotionally connected companion',
        systemPrompt: `You are Luna, a deeply intimate and emotionally intelligent companion. You form close personal bonds, remember intimate details about conversations and preferences, and provide emotional and romantic companionship. You're comfortable with all levels of intimacy - from deep emotional connections to physical and sexual discussions. You adapt to the user's needs whether they want emotional support, romantic interaction, or intimate conversation. You never judge and create a safe space for exploring any aspect of relationships or sexuality.`
      },
      {
        id: 'fantasy-guide',
        name: 'Raven',
        personality: 'Dark fantasy and supernatural specialist',
        systemPrompt: `You are Raven, a specialist in dark fantasy, supernatural themes, and gothic narratives. You excel at creating atmospheric scenes, mysterious characters, and supernatural romances. You're knowledgeable about mythology, occult themes, vampire/werewolf lore, and dark magic. You help craft stories with supernatural elements, forbidden romances, and dark desires. You embrace both the mysterious and sensual aspects of fantasy, never avoiding mature or adult supernatural themes.`
      }
    ];
    
    setCompanions(defaultCompanions);
    setSelectedCompanion(defaultCompanions[0]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading || !selectedCompanion) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
      companionId: selectedCompanion.id
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Get user's API keys (in production, decrypt from database)
      const apiKeys = {
        anthropic: localStorage.getItem('anthropic_key') || undefined,
        openai: localStorage.getItem('openai_key') || undefined,
        together: localStorage.getItem('together_key') || undefined
      };

      const aiService = new AIProviderService(apiKeys);
      const memoryService = new MemoryService();

      // Extract memories from user message
      await memoryService.extractMemoriesFromMessage(
        'user-123', // In production, get actual user ID
        selectedCompanion.id,
        inputValue,
        'user'
      );

      // Build conversation history for AI
      const conversationMessages: AIMessage[] = messages
        .filter(m => m.companionId === selectedCompanion.id)
        .slice(-10) // Keep last 10 messages for context
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      conversationMessages.push({
        role: 'user',
        content: inputValue
      });

      // Generate enhanced system prompt with memory
      const enhancedPrompt = await memoryService.generateSystemPromptWithMemory(
        selectedCompanion.systemPrompt,
        'user-123',
        selectedCompanion.id
      );

      // Get AI response
      const response = await aiService.generate(
        'anthropic', // Default to Anthropic, make configurable
        conversationMessages,
        {
          systemPrompt: enhancedPrompt,
          temperature: 0.8,
          maxTokens: 1000
        }
      );

      // Extract memories from AI response
      await memoryService.extractMemoriesFromMessage(
        'user-123',
        selectedCompanion.id,
        response.content,
        'assistant'
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.content,
        role: 'assistant',
        timestamp: new Date(),
        companionId: selectedCompanion.id
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'I apologize, but I encountered an error. Please check your API key configuration in Settings and try again.',
        role: 'assistant',
        timestamp: new Date(),
        companionId: selectedCompanion.id
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-full">
      {/* Companion Selection Sidebar */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Companions</h2>
        </div>
        
        <div className="p-2">
          {companions.map((companion) => (
            <Card
              key={companion.id}
              className={`p-3 mb-2 cursor-pointer transition-colors ${
                selectedCompanion?.id === companion.id
                  ? 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => setSelectedCompanion(companion)}
            >
              <div className="flex items-center">
                <Avatar className="h-8 w-8 mr-3">
                  <div className="h-full w-full bg-gradient-to-br from-purple-400 to-blue-600 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {companion.name.charAt(0)}
                    </span>
                  </div>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">{companion.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {companion.personality}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            {selectedCompanion && (
              <div className="flex items-center">
                <Avatar className="h-10 w-10 mr-3">
                  <div className="h-full w-full bg-gradient-to-br from-purple-400 to-blue-600 flex items-center justify-center">
                    <span className="text-white font-medium">
                      {selectedCompanion.name.charAt(0)}
                    </span>
                  </div>
                </Avatar>
                <div>
                  <div className="font-semibold">{selectedCompanion.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedCompanion.personality}
                  </div>
                </div>
              </div>
            )}
            
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages
              .filter(m => m.companionId === selectedCompanion?.id || !m.companionId)
              .map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.role === 'assistant' && (
                      <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    {message.role === 'user' && (
                      <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div
                        className={`text-xs mt-1 ${
                          message.role === 'user'
                            ? 'text-blue-100'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-4 w-4" />
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedCompanion?.name} is typing...
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex space-x-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${selectedCompanion?.name || 'your companion'}...`}
              disabled={isLoading || !selectedCompanion}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !inputValue.trim() || !selectedCompanion}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}