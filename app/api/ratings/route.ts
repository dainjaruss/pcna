import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserStats } from '@/lib/recommendations';
import { allowRequest } from '@/lib/rate-limiter';
import { handleApiError } from '@/lib/error-handling';

// POST /api/ratings - Create a rating
export async function POST(request: NextRequest) {
  // Rate limit rating submissions
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || 'unknown'
  const key = `rl:ratings:${ip}`
  const allowed = await allowRequest(key, 20, 60) // 20 ratings per minute
  if (!allowed) {
    return NextResponse.json({ error: 'Too many rating submissions, try again later' }, { status: 429 })
  }

  try {
    const body = await request.json();
    const { articleId, rating, feedback } = body;
    
    if (!articleId || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }
    
    const newRating = await prisma.userRating.create({
      data: {
        articleId,
        rating,
        feedback
      }
    });
    
    return NextResponse.json(newRating, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'createRating')
  }
}

// GET /api/ratings - Get user statistics
export async function GET() {
  try {
    const stats = await getUserStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching ratings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ratings' },
      { status: 500 }
    );
  }
}
