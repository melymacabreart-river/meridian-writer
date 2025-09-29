import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const together = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY,
  baseURL: 'https://api.together.xyz/v1',
});

export async function POST(request: NextRequest) {
  try {
    const { messages, companionId, systemPrompt } = await request.json();

    if (!process.env.TOGETHER_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    // Use companion-specific system prompt or default
    const defaultSystemPrompt = `You are a helpful and creative AI companion. You remember conversations and build relationships over time. You're supportive, engaging, and adapt to the user's interests and writing style.`;
    
    const formattedMessages = [
      { role: 'system', content: systemPrompt || defaultSystemPrompt },
      ...messages
    ];

    const response = await together.chat.completions.create({
      model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
      messages: formattedMessages,
      max_tokens: 500,
      temperature: 0.9,
    });

    const content = response.choices[0]?.message?.content || '';

    return NextResponse.json({
      content,
      companionId,
      tokensUsed: response.usage?.total_tokens || 0
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ 
      error: 'Chat failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}