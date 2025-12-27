import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma';
import { getRecommendedArticles } from '@/lib/recommendations';
import { getAuthFromRequest } from '@/lib/auth';

// GET /api/articles - Get articles (with optional pagination and filtering)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const useRecommendations = searchParams.get('recommended') === 'true';
    const sourceId = searchParams.get('source');
    const celebrity = searchParams.get('celebrity');
    
    const offset = (page - 1) * limit;
    
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
    const where: any = {};
    
    if (sourceId) {
      where.sourceId = sourceId;
    }
    
    if (celebrity) {
      where.celebrities = {
        has: celebrity.toLowerCase()
      };
    }
    
    // Standard query without recommendations
    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          source: true,
          userRatings: true
        },
        orderBy: {
          publishDate: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.article.count({ where })
    ]);
    
    return NextResponse.json({
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

// POST /api/articles - Save a web search result to database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, summary, url, content, publishDate, categories, celebrities } = body;

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

    return NextResponse.json(article);
  } catch (error) {
    console.error('Error saving web result:', error);
    return NextResponse.json(
      { error: 'Failed to save article' },
      { status: 500 }
    );
  }
}
