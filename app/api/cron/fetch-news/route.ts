import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNews } from '@/lib/news-fetcher';

// POST /api/cron/fetch-news - Trigger news fetch (can be called by n8n, cron, or manually)
export async function POST(request: NextRequest) {
  try {
    // API Key authentication for external calls (e.g., from n8n)
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.API_KEY;
    
    // If API_KEY is set, require authentication
    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing API key' },
        { status: 401 }
      );
    }
    
    console.log(`[${new Date().toISOString()}] News fetch triggered via API`);
    const result = await fetchAllNews();
    
    return NextResponse.json({
      success: true,
      message: 'News fetch completed successfully',
      ...result
    });
  } catch (error: any) {
    console.error('Error in fetch news API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch news' },
      { status: 500 }
    );
  }
}

// Allow GET for manual triggering from browser
export async function GET(request: NextRequest) {
  return POST(request);
}
