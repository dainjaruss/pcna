import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNews } from '@/lib/news-fetcher';
import { logger, withLogging, logSecurityEvent } from '@/lib/logger';

// POST /api/cron/fetch-news - Trigger news fetch (can be called by n8n, cron, or manually)
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // API Key authentication for external calls (e.g., from n8n)
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.API_KEY;
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    
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
        logSecurityEvent({
          event: 'unauthorized_access',
          ip,
          details: { endpoint: '/api/cron/fetch-news', origin, uiTrigger }
        });
        return NextResponse.json(
          { error: 'Unauthorized - Invalid or missing API key' },
          { status: 401 }
        );
      }
    }
    
    logger.info('News fetch triggered via API', { source: uiTrigger ? 'ui' : 'external', origin });
    
    const result = await withLogging('fetchAllNews', () => fetchAllNews(), { 
      source: uiTrigger ? 'ui' : 'external' 
    });
    
    const duration = Date.now() - startTime;
    logger.info('News fetch completed', { duration, ...result });
    
    return NextResponse.json({
      success: true,
      message: 'News fetch completed successfully',
      ...result
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('Error in fetch news API', { 
      error: error.message, 
      stack: error.stack,
      duration 
    });
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
