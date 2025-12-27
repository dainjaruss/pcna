import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
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

    // Get all settings
    const settings = await prisma.setting.findMany();
    
    const settingsMap: Record<string, string> = {};
    settings.forEach((setting: { key: string; value: string }) => {
      settingsMap[setting.key] = setting.value;
    });

    return NextResponse.json({
      refreshInterval: settingsMap.refreshInterval || '6',
      emailTime: settingsMap.emailTime || '08:00',
      enableRecommendations: settingsMap.enableRecommendations || 'true',
      retentionDays: settingsMap.retentionDays || '30',
      enableEmailSummaries: settingsMap.enableEmailSummaries || 'true',
      apiRateLimit: settingsMap.apiRateLimit || '100',
      maintenanceMode: settingsMap.maintenanceMode || 'false',
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const settings = await request.json();

    // Upsert each setting
    const settingKeys = [
      'refreshInterval',
      'emailTime',
      'enableRecommendations',
      'retentionDays',
      'enableEmailSummaries',
      'apiRateLimit',
      'maintenanceMode',
    ];

    for (const key of settingKeys) {
      if (settings[key] !== undefined) {
        await prisma.setting.upsert({
          where: { key },
          update: { value: String(settings[key]) },
          create: { key, value: String(settings[key]) },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating system settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
