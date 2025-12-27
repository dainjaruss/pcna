import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

// GET /api/settings - Get settings (global or user)
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request as any)
    if (auth?.sub) {
      // Return user settings
      const userSettings = await prisma.userSetting.findUnique({
        where: { userId: auth.sub }
      })
      return NextResponse.json({
        settings: userSettings ? {
          preferredCelebrities: userSettings.preferredCelebrities,
          preferredCategories: userSettings.preferredCategories
        } : { preferredCelebrities: [], preferredCategories: [] }
      })
    }

    // Global settings
    const settings = await prisma.setting.findMany();
    
    // Convert to key-value object
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);
    
    // Add defaults if not set
    const defaults = {
      refreshInterval: '6',
      emailTime: '08:00',
      enableRecommendations: 'true'
    };
    
    return NextResponse.json({ ...defaults, ...settingsObj });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request as any)
    const body = await request.json();

    if (auth?.sub) {
      // Update user settings
      await prisma.userSetting.upsert({
        where: { userId: auth.sub },
        update: {
          preferredCelebrities: body.preferredCelebrities || [],
          preferredCategories: body.preferredCategories || []
        },
        create: {
          userId: auth.sub,
          preferredCelebrities: body.preferredCelebrities || [],
          preferredCategories: body.preferredCategories || []
        }
      })
      return NextResponse.json({ success: true })
    }

    // Update global settings
    for (const [key, value] of Object.entries(body)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
