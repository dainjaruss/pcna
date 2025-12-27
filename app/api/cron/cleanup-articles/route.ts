import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Get all users with their retention settings
    const users = await prisma.user.findMany({
      include: {
        settings: true,
      },
    });

    let totalArchived = 0;

    for (const user of users) {
      const retentionDays = user.settings?.retentionDays || 30; // Default to 30 days

      if (retentionDays === 0) {
        // User chose never delete, skip
        continue;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Archive articles older than cutoff date that haven't been rated by this user
      const result = await prisma.article.updateMany({
        where: {
          publishDate: {
            lt: cutoffDate,
          },
          archived: false,
          // Only archive if user hasn't rated this article
          NOT: {
            userRatings: {
              some: {
                userId: user.id,
              },
            },
          },
        },
        data: {
          archived: true,
        },
      });

      totalArchived += result.count;
    }

    return NextResponse.json({
      success: true,
      message: `Archived ${totalArchived} articles across all users`,
      totalArchived,
    });
  } catch (error) {
    console.error('Error cleaning up articles:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup articles' },
      { status: 500 }
    );
  }
}