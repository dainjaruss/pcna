import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get table statistics
    const tables = await Promise.all([
      getTableStats('Article'),
      getTableStats('User'),
      getTableStats('Source'),
      getTableStats('UserRating'),
      getTableStats('UserInteraction'),
      getTableStats('EmailRecipient'),
      getTableStats('RefreshToken'),
      getTableStats('Setting'),
    ]);

    // Get total database size
    let totalSize = 'N/A';
    try {
      const result = await prisma.$queryRaw<[{ size: string }]>`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `;
      totalSize = result[0]?.size || 'N/A';
    } catch (e) {
      // Ignore
    }

    // Get last backup from settings
    const lastBackupSetting = await prisma.setting.findUnique({
      where: { key: 'lastDatabaseBackup' },
    });

    return NextResponse.json({
      tables: tables.filter(Boolean),
      totalSize,
      connectionStatus: 'Connected',
      lastBackup: lastBackupSetting?.value
        ? new Date(lastBackupSetting.value).toLocaleString()
        : 'Never',
    });
  } catch (error) {
    console.error('Error fetching database stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch database stats' },
      { status: 500 }
    );
  }
}

async function getTableStats(tableName: string) {
  try {
    let count = 0;
    
    switch (tableName) {
      case 'Article':
        count = await prisma.article.count();
        break;
      case 'User':
        count = await prisma.user.count();
        break;
      case 'Source':
        count = await prisma.source.count();
        break;
      case 'UserRating':
        count = await prisma.userRating.count();
        break;
      case 'UserInteraction':
        count = await prisma.userInteraction.count();
        break;
      case 'EmailRecipient':
        count = await prisma.emailRecipient.count();
        break;
      case 'RefreshToken':
        count = await prisma.refreshToken.count();
        break;
      case 'Setting':
        count = await prisma.setting.count();
        break;
    }

    // Estimate size based on row count (rough approximation)
    const sizeKB = count * 2; // ~2KB per row average
    const size = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

    return {
      name: tableName,
      rowCount: count,
      size,
    };
  } catch (error) {
    return null;
  }
}
