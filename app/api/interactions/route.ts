import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth?.sub) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { articleId, interactionType, duration, metadata } = body;

    if (!articleId || !interactionType) {
      return NextResponse.json(
        { error: 'Article ID and interaction type are required' },
        { status: 400 }
      );
    }

    // Validate interaction type
    const validTypes = ['view', 'click', 'rate', 'share', 'save'];
    if (!validTypes.includes(interactionType)) {
      return NextResponse.json(
        { error: 'Invalid interaction type' },
        { status: 400 }
      );
    }

    // Record the interaction
    const interaction = await prisma.userInteraction.create({
      data: {
        userId: auth.sub,
        articleId,
        interactionType,
        duration: duration ? parseInt(duration) : null,
        metadata: metadata || null,
      },
    });

    return NextResponse.json({
      success: true,
      interaction: {
        id: interaction.id,
        type: interaction.interactionType,
        createdAt: interaction.createdAt,
      },
    });
  } catch (error) {
    console.error('Error recording interaction:', error);
    return NextResponse.json(
      { error: 'Failed to record interaction' },
      { status: 500 }
    );
  }
}