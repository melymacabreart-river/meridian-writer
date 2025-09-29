import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const together = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY,
  baseURL: 'https://api.together.xyz/v1',
});

export async function POST(request: NextRequest) {
  try {
    const { messages, model = 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', systemPrompt, maxTokens = 300, temperature = 0.8 } = await request.json();

    if (!process.env.TOGETHER_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    // Prepare messages with system prompt
    const formattedMessages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages
    ];

    const response = await together.chat.completions.create({
      model,
      messages: formattedMessages,
      max_tokens: maxTokens,
      temperature,
    });

    const content = response.choices[0]?.message?.content || '';

    return NextResponse.json({
      content,
      model,
      tokensUsed: response.usage?.total_tokens || 0
    });

  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json({ 
      error: 'AI generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}