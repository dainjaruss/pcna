import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface SourceWithCount {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  credibilityRating: number;
  type: string;
  isCustom: boolean;
  createdAt: Date;
  _count: {
    articles: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const sources = await prisma.source.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        url: true,
        enabled: true,
        credibilityRating: true,
        type: true,
        isCustom: true,
        createdAt: true,
        _count: {
          select: { articles: true }
        }
      }
    });

    const formattedSources = sources.map((source: SourceWithCount) => ({
      id: source.id,
      name: source.name,
      url: source.url,
      enabled: source.enabled,
      credibilityRating: source.credibilityRating,
      type: source.type,
      isCustom: source.isCustom,
      createdAt: source.createdAt,
      articleCount: source._count.articles
    }));

    return NextResponse.json(formattedSources);
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, type = 'rss' } = body;

    if (!name || !url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      );
    }

    const source = await prisma.source.create({
      data: {
        name,
        url,
        type,
        enabled: true,
        credibilityRating: 5,
        isCustom: true
      }
    });

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    console.error('Error creating source:', error);
    return NextResponse.json(
      { error: 'Failed to create source' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, enabled, credibilityRating } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (typeof enabled === 'boolean') updateData.enabled = enabled;
    if (typeof credibilityRating === 'number') updateData.credibilityRating = credibilityRating;

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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
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
