import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get counts from database
    const [
      articlesCount,
      usersCount,
      sourcesCount,
      ratingsCount,
      todayArticles,
      activeUsers
    ] = await Promise.all([
      prisma.article.count(),
      prisma.user.count(),
      prisma.source.count(),
      prisma.userRating.count(),
      prisma.article.count({
        where: {
          publishDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    // Get recent articles
    const recentArticles = await prisma.article.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        categories: true,
        createdAt: true
      }
    });

    // Get last fetch time (latest article created)
    const lastArticle = await prisma.article.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    });

    // Get system status
    const systemStatus = {
      database: 'connected',
      cache: process.env.REDIS_URL ? 'connected' : 'not configured',
      email: process.env.RESEND_API_KEY ? 'configured' : 'not configured'
    };

    return NextResponse.json({
      stats: {
        articles: {
          total: articlesCount,
          today: todayArticles
        },
        users: {
          total: usersCount,
          active: activeUsers
        },
        sources: sourcesCount,
        ratings: ratingsCount
      },
      recentArticles,
      lastFetch: lastArticle ? lastArticle.createdAt.toISOString() : null,
      systemStatus
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
