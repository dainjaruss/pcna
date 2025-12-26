import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserStats } from '@/lib/recommendations';

// POST /api/ratings - Create a rating
export async function POST(request: NextRequest) {
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
    console.error('Error creating rating:', error);
    return NextResponse.json(
      { error: 'Failed to create rating' },
      { status: 500 }
    );
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
