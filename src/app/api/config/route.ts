import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Return API configuration (keys are available server-side)
    const config = {
      together: !!process.env.TOGETHER_API_KEY,
      serper: !!process.env.SERPER_API_KEY,
      firecrawl: !!process.env.FIRECRAWL_API_KEY,
      // Don't expose actual keys, just whether they're available
      hasKeys: {
        together: process.env.TOGETHER_API_KEY?.length > 0,
        serper: process.env.SERPER_API_KEY?.length > 0,
        firecrawl: process.env.FIRECRAWL_API_KEY?.length > 0
      }
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Config API error:', error);
    return NextResponse.json({ error: 'Configuration unavailable' }, { status: 500 });
  }
}