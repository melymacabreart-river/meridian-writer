import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 5 } = await request.json();

    if (!process.env.SERPER_API_KEY) {
      return NextResponse.json({ error: 'Research service not configured' }, { status: 500 });
    }

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.SERPER_API_KEY
      },
      body: JSON.stringify({
        q: query,
        num: limit
      })
    });

    if (!response.ok) {
      throw new Error('Research API request failed');
    }

    const data = await response.json();
    
    const results = data.organic?.slice(0, limit).map((result: any) => ({
      title: result.title,
      snippet: result.snippet,
      url: result.link,
      source: new URL(result.link).hostname
    })) || [];

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Research API error:', error);
    return NextResponse.json({ 
      error: 'Research failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}