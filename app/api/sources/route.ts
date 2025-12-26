import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
