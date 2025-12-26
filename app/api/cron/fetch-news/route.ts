import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNews } from '@/lib/news-fetcher';

// POST /api/cron/fetch-news - Trigger news fetch (can be called by n8n, cron, or manually)
export async function POST(request: NextRequest) {
  try {
    // API Key authentication for external calls (e.g., from n8n)
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.API_KEY;
    
    // If API_KEY is set, require authentication. Allow a trusted UI trigger
    // from the same origin by sending `x-ui-trigger: true` header.
    const uiTrigger = request.headers.get('x-ui-trigger');
    const origin = request.headers.get('origin') || request.headers.get('referer') || '';
    const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || '';

    if (apiKey) {
      const isValidBearer = authHeader === `Bearer ${apiKey}`;
      // Allow UI trigger if header present and either:
      // - origin starts with configured NEXT_PUBLIC_APP_URL
      // - OR origin appears to be a local app origin (port 3000)
      const isUiAllowed = uiTrigger === 'true' && (
        (allowedOrigin && origin.startsWith(allowedOrigin)) ||
        (origin && origin.includes(':3000'))
      );

      if (!isValidBearer && !isUiAllowed) {
        console.warn('Unauthorized fetch-news attempt', { origin, allowedOrigin, uiTrigger, authHeaderPresent: !!authHeader });
        return NextResponse.json(
          { error: 'Unauthorized - Invalid or missing API key' },
          { status: 401 }
        );
      }
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
