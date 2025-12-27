import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma';
import { getRecommendedArticles } from '@/lib/recommendations';
import { getAuthFromRequest } from '@/lib/auth';
import { allowRequest } from '@/lib/rate-limiter';
import { validateAndSanitizeArticleData } from '@/lib/sanitization';
import { handleApiError } from '@/lib/error-handling';
import { Cache } from '@/lib/cache';
import { logger, logPerformance } from '@/lib/logger';

// GET /api/articles - Get articles (with optional pagination and filtering)
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || 'unknown'
  
  // Rate limit article requests
  const key = `rl:articles:${ip}`
  const allowed = await allowRequest(key, 60, 60) // 60 article requests per minute
  if (!allowed) {
    logger.warn('Rate limit exceeded for articles', { ip });
    return NextResponse.json({ error: 'Too many requests, try again later' }, { status: 429 })
  }

  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const cursor = searchParams.get('cursor');
    const useRecommendations = searchParams.get('recommended') === 'true';
    const sourceId = searchParams.get('source');
    const celebrity = searchParams.get('celebrity');
    
    const auth = getAuthFromRequest(request as any);
    const userId = auth?.sub;
    
    const offset = cursor ? 0 : (page - 1) * limit;
    
    // If recommendations are enabled, use recommendation algorithm
    if (useRecommendations) {
      const auth = getAuthFromRequest(request as any);
      const articles = await getRecommendedArticles(auth?.sub, limit, offset);
      const total = await prisma.article.count();
      
      return NextResponse.json({
        articles,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    }
    
    // Build where clause for filtering
    const where: any = {
      archived: false
    };
    
    if (sourceId) {
      where.sourceId = sourceId;
    }
    
    if (celebrity) {
      where.celebrities = {
        has: celebrity.toLowerCase()
      };
    }
    
    // Standard query without recommendations
    const cacheKey = `articles:list:${sourceId || 'all'}:${celebrity || 'all'}:${cursor || page}:${limit}:${userId || 'anon'}`;
    
    const result = await Cache.getOrSet(cacheKey, async () => {
      const [articles, total] = await Promise.all([
        prisma.article.findMany({
          where,
          include: {
            source: {
              select: {
                name: true,
                credibilityRating: true,
                credibilityReason: true
              }
            },
            userRatings: {
              where: userId ? { userId } : undefined,
              select: { rating: true, createdAt: true }
            }
          },
          orderBy: {
            publishDate: 'desc'
          },
          ...(cursor 
            ? { 
                take: limit,
                skip: 1, // Skip the cursor item
                cursor: { id: cursor }
              }
            : {
                skip: offset,
                take: limit
              }
          )
        }),
        prisma.article.count({ where })
      ]);
      
      return { articles, total };
    }, { ttl: 300 }); // Cache for 5 minutes
    
    const { articles, total } = result;
    
    const nextCursor = articles.length === limit ? articles[articles.length - 1].id : null;
    
    // Log performance metrics
    const duration = Date.now() - startTime;
    logPerformance({
      route: '/api/articles',
      method: 'GET',
      statusCode: 200,
      responseTime: duration,
      cacheHit: false,
      ip,
    });
    
    return NextResponse.json({
      articles,
      pagination: {
        ...(cursor ? {} : { page, totalPages: Math.ceil(total / limit) }),
        limit,
        total,
        ...(nextCursor && { nextCursor })
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error fetching articles', { 
      error: error instanceof Error ? error.message : String(error),
      duration,
      ip 
    });
    return handleApiError(error, 'getArticles')
  }
}

// POST /api/articles - Save a web search result to database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Sanitize and validate input data
    const sanitizedData = validateAndSanitizeArticleData(body);
    const { title, summary, url, content, publishDate, categories, celebrities } = sanitizedData;

    if (!title || !url) {
      return NextResponse.json(
        { error: 'Title and URL are required' },
        { status: 400 }
      );
    }

    // Find or create a "Web Search" source
    let webSource = await prisma.source.findFirst({
      where: { name: 'Web Search Results' }
    });

    if (!webSource) {
      webSource = await prisma.source.create({
        data: {
          name: 'Web Search Results',
          url: 'https://duckduckgo.com',
          enabled: true,
          credibilityRating: 5,
          type: 'api',
          isCustom: false
        }
      });
    }

    // Check if article already exists
    const existingArticle = await prisma.article.findFirst({
      where: { url }
    });

    if (existingArticle) {
      return NextResponse.json(
        { error: 'Article already exists in database' },
        { status: 409 }
      );
    }

    // Create the article
    const article = await prisma.article.create({
      data: {
        title,
        summary: summary || '',
        content: content || summary || '',
        url,
        sourceId: webSource.id,
        credibilityRating: 5, // Default credibility for web results
        publishDate: publishDate ? new Date(publishDate) : new Date(),
        categories: categories || [],
        celebrities: celebrities || []
      }
    });

    // Invalidate article caches since we added a new article
    await Cache.invalidate('articles:list:all:all:*');
    
    logger.info('Article saved from web search', { articleId: article.id, title: article.title });

    return NextResponse.json(article);
  } catch (error) {
    logger.error('Error saving article from web search', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return handleApiError(error, 'saveArticle')
  }
}
