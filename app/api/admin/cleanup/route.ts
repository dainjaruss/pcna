import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
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

    // Get retention days setting
    const retentionSetting = await prisma.setting.findUnique({
      where: { key: 'retentionDays' },
    });
    const retentionDays = parseInt(retentionSetting?.value || '30');

    if (retentionDays === 0) {
      return NextResponse.json({
        message: 'Article cleanup disabled (retention set to never delete)',
        archivedCount: 0,
        deletedTokens: 0,
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Archive old articles instead of deleting
    const archived = await prisma.article.updateMany({
      where: {
        createdAt: { lt: cutoffDate },
        archived: false,
      },
      data: { archived: true },
    });

    // Clean up expired refresh tokens
    const deletedTokens = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revoked: true },
        ],
      },
    });

    // Clean up old interactions (keep last 90 days)
    const interactionCutoff = new Date();
    interactionCutoff.setDate(interactionCutoff.getDate() - 90);
    
    await prisma.userInteraction.deleteMany({
      where: {
        createdAt: { lt: interactionCutoff },
      },
    });

    return NextResponse.json({
      message: 'Cleanup completed successfully',
      archivedCount: archived.count,
      deletedTokens: deletedTokens.count,
    });
  } catch (error) {
    console.error('Error running cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to run cleanup' },
      { status: 500 }
    );
  }
}
