import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

interface SearchFilters {
  query?: string
  source?: string
  dateFrom?: string
  dateTo?: string
  category?: string
  page?: number
  limit?: number
}

// GET /api/search - Search articles with filters
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const filters: SearchFilters = {
      query: searchParams.get('query') || undefined,
      source: searchParams.get('source') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      category: searchParams.get('category') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    };

    const offset = (filters.page! - 1) * filters.limit!;

    // Build where clause
    const where: any = {};

    // Text search in title, summary, and content
    if (filters.query) {
      where.OR = [
        { title: { contains: filters.query, mode: 'insensitive' } },
        { summary: { contains: filters.query, mode: 'insensitive' } },
        { content: { contains: filters.query, mode: 'insensitive' } },
        { celebrities: { has: filters.query.toLowerCase() } },
        { categories: { has: filters.query.toLowerCase() } }
      ];
    }

    // Source filter
    if (filters.source) {
      where.sourceId = filters.source;
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      where.publishDate = {};
      if (filters.dateFrom) {
        where.publishDate.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        // Set to end of day
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.publishDate.lte = toDate;
      }
    }

    // Category filter
    if (filters.category) {
      where.categories = {
        has: filters.category.toLowerCase()
      };
    }

    // Execute search
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
        take: filters.limit
      }),
      prisma.article.count({ where })
    ]);

    // Add search highlighting (simple version - mark matching terms)
    const highlightedArticles = articles.map((article: any) => {
      let highlightedTitle = article.title;
      let highlightedSummary = article.summary;

      if (filters.query) {
        const query = filters.query.toLowerCase();
        const regex = new RegExp(`(${query})`, 'gi');

        highlightedTitle = article.title.replace(regex, '<mark>$1</mark>');
        highlightedSummary = article.summary.replace(regex, '<mark>$1</mark>');
      }

      return {
        ...article,
        highlightedTitle,
        highlightedSummary
      };
    });

    return NextResponse.json({
      articles: highlightedArticles,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit!)
      },
      query: filters.query || null
    });
  } catch (error) {
    console.error('Error searching articles:', error);
    return NextResponse.json(
      { error: 'Failed to search articles' },
      { status: 500 }
    );
  }
}