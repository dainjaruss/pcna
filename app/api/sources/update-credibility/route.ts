import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeSourceCredibility } from '@/lib/credibility';

interface CredibilityChange {
  sourceId: string;
  sourceName: string;
  oldScore: number;
  newScore: number;
  reason: string;
}

// POST /api/sources/update-credibility - Update credibility scores for all sources
export async function POST(request: NextRequest) {
  try {
    // Check for API key authentication (for automated calls)
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.CRON_API_KEY;

    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting weekly credibility update...');

    // Get all enabled sources
    const sources = await prisma.source.findMany({
      where: { enabled: true },
      select: {
        id: true,
        name: true,
        url: true,
        credibilityRating: true,
        lastCredibilityCheck: true,
        credibilityHistory: true,
        _count: {
          select: { articles: true }
        }
      }
    });

    console.log(`Found ${sources.length} sources to check`);

    const changes: CredibilityChange[] = [];
    let sourcesUpdated = 0;
    const batchSize = 5; // Process in batches to avoid rate limits

    for (let i = 0; i < sources.length; i += batchSize) {
      const batch = sources.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sources.length / batchSize)}`);

      const batchPromises = batch.map(async (source: typeof sources[0]) => {
        try {
          // Skip sources that were checked recently (within 6 days to allow some buffer)
          const daysSinceLastCheck = Math.floor(
            (Date.now() - source.lastCredibilityCheck.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceLastCheck < 6) {
            console.log(`Skipping ${source.name} - checked ${daysSinceLastCheck} days ago`);
            return null;
          }

          // Skip inactive sources (no articles in 30 days)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const recentArticles = await prisma.article.count({
            where: {
              sourceId: source.id,
              createdAt: { gte: thirtyDaysAgo }
            }
          });

          if (recentArticles === 0) {
            console.log(`Skipping ${source.name} - no recent articles`);
            return null;
          }

          console.log(`Analyzing ${source.name}...`);
          const analysis = await analyzeSourceCredibility(source.name, source.url);

          const oldScore = source.credibilityRating;
          const newScore = analysis.score;
          const scoreDifference = Math.abs(newScore - oldScore);

          // Update if score changed by 1 or more points
          if (scoreDifference >= 1) {
            // Update credibility history
            const history = Array.isArray(source.credibilityHistory) ? source.credibilityHistory : [];
            const newHistoryEntry = {
              date: new Date().toISOString(),
              score: newScore,
              reason: analysis.reason,
              confidence: analysis.confidence
            };

            // Keep only last 10 history entries
            const updatedHistory = [newHistoryEntry, ...history].slice(0, 10);

            await prisma.source.update({
              where: { id: source.id },
              data: {
                credibilityRating: newScore,
                credibilityReason: analysis.reason,
                lastCredibilityCheck: new Date(),
                credibilityHistory: updatedHistory
              }
            });

            changes.push({
              sourceId: source.id,
              sourceName: source.name,
              oldScore,
              newScore,
              reason: analysis.reason
            });

            sourcesUpdated++;
            console.log(`Updated ${source.name}: ${oldScore} → ${newScore}`);
          } else {
            // Just update the last check timestamp
            await prisma.source.update({
              where: { id: source.id },
              data: { lastCredibilityCheck: new Date() }
            });
            console.log(`No change for ${source.name} (score: ${oldScore})`);
          }

          // Add delay between analyses to be respectful to APIs
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`Error analyzing ${source.name}:`, error);
          // Continue with other sources even if one fails
        }
      });

      await Promise.all(batchPromises);
    }

    console.log(`Credibility update complete. Checked: ${sources.length}, Updated: ${sourcesUpdated}`);

    return NextResponse.json({
      success: true,
      sourcesChecked: sources.length,
      sourcesUpdated,
      changes
    });

  } catch (error: any) {
    console.error('Error in credibility update:', error);
    return NextResponse.json(
      { error: 'Failed to update credibility scores', details: error.message },
      { status: 500 }
    );
  }
}