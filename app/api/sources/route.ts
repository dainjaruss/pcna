import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getAuthFromRequest } from '@/lib/auth';
import { analyzeSourceCredibility } from '@/lib/credibility';

// GET /api/sources - Get all sources
export async function GET() {
  try {
    const sources = await prisma.source.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { articles: true }
        }
      }
    });
    return NextResponse.json(sources);
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}

// PUT /api/sources - Update source
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, enabled, credibilityRating } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing source ID' },
        { status: 400 }
      );
    }
    
    const updateData: any = {};
    if (typeof enabled === 'boolean') {
      updateData.enabled = enabled;
    }
    if (typeof credibilityRating === 'number') {
      if (credibilityRating < 1 || credibilityRating > 10) {
        return NextResponse.json(
          { error: 'Credibility rating must be between 1 and 10' },
          { status: 400 }
        );
      }
      updateData.credibilityRating = credibilityRating;
    }
    
    const source = await prisma.source.update({
      where: { id },
      data: updateData
    });
    
    return NextResponse.json(source);
  } catch (error) {
    console.error('Error updating source:', error);
    return NextResponse.json(
      { error: 'Failed to update source' },
      { status: 500 }
    );
  }
}

// DELETE /api/sources - Delete a custom source
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing source ID' },
        { status: 400 }
      );
    }
    
    // Check if source exists and is custom
    const source = await prisma.source.findUnique({
      where: { id }
    });
    
    if (!source) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      );
    }
    
    if (!source.isCustom) {
      return NextResponse.json(
        { error: 'Cannot delete built-in sources' },
        { status: 403 }
      );
    }
    
    // Check ownership if authenticated
    const auth = getAuthFromRequest(request as any);
    if (auth?.sub && source.ownerId && source.ownerId !== auth.sub) {
      return NextResponse.json(
        { error: 'You can only delete your own custom sources' },
        { status: 403 }
      );
    }
    
    await prisma.source.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting source:', error);
    return NextResponse.json(
      { error: 'Failed to delete source' },
      { status: 500 }
    );
  }
}

// POST /api/sources - Create a new custom source (validated)
const createSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
  rssUrl: z.string().optional(),
  type: z.enum(['rss', 'scrape', 'api']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSchema.parse(body);

    const auth = getAuthFromRequest(request as any);
    const ownerId = auth?.sub ?? null;

    // Normalize URLs - add https:// if missing
    const normalizeUrl = (url: string): string => {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `https://${url}`;
      }
      return url;
    };

    const normalizedUrl = normalizeUrl(parsed.url);
    const normalizedRssUrl = parsed.rssUrl ? normalizeUrl(parsed.rssUrl) : undefined;

    // Validate URLs are properly formed
    try {
      new URL(normalizedUrl);
      if (normalizedRssUrl) {
        new URL(normalizedRssUrl);
      }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    if (normalizedRssUrl) {
      try {
        const res = await fetch(normalizedRssUrl, { method: 'GET' });
        if (!res.ok) return NextResponse.json({ error: 'Unable to fetch rssUrl for validation' }, { status: 400 });
      } catch (e) {
        return NextResponse.json({ error: 'Failed to validate rssUrl' }, { status: 400 });
      }
    }

    // Perform automated credibility analysis
    console.log(`Analyzing credibility for ${parsed.name}...`);
    const credibilityAnalysis = await analyzeSourceCredibility(parsed.name, normalizedUrl);

    // Create credibility history entry
    const credibilityHistory = [{
      date: new Date().toISOString(),
      score: credibilityAnalysis.score,
      reason: credibilityAnalysis.reason,
      confidence: credibilityAnalysis.confidence
    }];

    const src = await prisma.source.create({
      data: {
        name: parsed.name,
        url: normalizedUrl,
        rssUrl: normalizedRssUrl,
        credibilityRating: credibilityAnalysis.score,
        credibilityReason: credibilityAnalysis.reason,
        lastCredibilityCheck: new Date(),
        credibilityHistory: credibilityHistory,
        type: parsed.type ?? 'rss',
        isCustom: true,
        ownerId: ownerId,
      },
    });

    return NextResponse.json({
      ...src,
      credibilityAnalysis: {
        score: credibilityAnalysis.score,
        reason: credibilityAnalysis.reason,
        strengths: credibilityAnalysis.strengths,
        concerns: credibilityAnalysis.concerns,
        confidence: credibilityAnalysis.confidence
      }
    });
  } catch (error: any) {
    console.error('Error creating source:', error);
    return NextResponse.json({ error: error.message || 'Failed to create source' }, { status: 400 });
  }
}
