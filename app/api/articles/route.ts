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
