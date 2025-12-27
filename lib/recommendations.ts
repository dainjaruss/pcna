import { prisma } from './prisma';

interface ArticleWithScore {
  id: string;
  title: string;
  summary: string;
  url: string;
  imageUrl: string | null;
  credibilityRating: number;
  publishDate: Date;
  celebrities: string[];
  categories: string[];
  source: {
    name: string;
    credibilityRating: number;
  };
  userRatings: {
    rating: number;
  }[];
  score?: number;
}

// Collaborative filtering: Find similar users based on rating patterns
async function findSimilarUsers(userId: string, limit: number = 5): Promise<string[]> {
  // Get current user's ratings
  const userRatings = await prisma.userRating.findMany({
    where: { userId },
    select: { articleId: true, rating: true }
  });

  if (userRatings.length < 3) return []; // Need minimum ratings for meaningful similarity

  // Find users who rated the same articles
  const articleIds = userRatings.map((r: { articleId: string; rating: number }) => r.articleId);
  const similarUsers = await prisma.userRating.findMany({
    where: {
      articleId: { in: articleIds },
      userId: { not: userId }
    },
    select: {
      userId: true,
      articleId: true,
      rating: true
    }
  });

  // Group by user and calculate similarity score
  const userSimilarities = new Map<string, { common: number, similarity: number }>();

  similarUsers.forEach((rating: { userId: string | null; articleId: string; rating: number }) => {
    if (!rating.userId) return; // Skip if userId is null
    
    const userRating = userRatings.find((ur: { articleId: string; rating: number }) => ur.articleId === rating.articleId);
    if (!userRating) return;

    const existing = userSimilarities.get(rating.userId) || { common: 0, similarity: 0 };
    existing.common++;
    // Cosine similarity component: rating difference
    existing.similarity += (5 - Math.abs(userRating.rating - rating.rating)) / 5;
    userSimilarities.set(rating.userId, existing);
  });

  // Calculate final similarity scores and return top similar users
  return Array.from(userSimilarities.entries())
    .filter(([_, data]) => data.common >= 2) // At least 2 common ratings
    .map(([userId, data]) => ({
      userId,
      score: data.similarity / data.common // Average similarity per common rating
    }))
    .sort((a: { userId: string; score: number }, b: { userId: string; score: number }) => b.score - a.score)
    .slice(0, limit)
    .map((item: { userId: string; score: number }) => item.userId);
}

// Topic clustering: Group articles by content similarity
async function getTopicClusters(limit: number = 20): Promise<Map<string, string[]>> {
  // Simple topic clustering based on shared celebrities and categories
  const articles = await prisma.article.findMany({
    where: { archived: false },
    select: {
      id: true,
      celebrities: true,
      categories: true,
      title: true
    },
    orderBy: { publishDate: 'desc' },
    take: 200 // Analyze recent articles
  });

  const clusters = new Map<string, string[]>();

  articles.forEach((article: { id: string; celebrities: string[]; categories: string[]; title: string }) => {
    // Create cluster key based on primary celebrity or category
    const primaryTopic = article.celebrities[0] || article.categories[0] || 'general';

    if (!clusters.has(primaryTopic)) {
      clusters.set(primaryTopic, []);
    }
    clusters.get(primaryTopic)!.push(article.id);
  });

  // Return clusters with multiple articles
  return new Map(
    Array.from(clusters.entries())
      .filter(([_, articles]: [string, string[]]) => articles.length >= 3)
      .slice(0, limit)
  );
}

// Get recommended articles based on user ratings and explicit preferences
export async function getRecommendedArticles(
  userId?: string,
  limit: number = 20,
  offset: number = 0
): Promise<ArticleWithScore[]> {
  // Get user settings for explicit preferences
  let userSettings = null;
  if (userId) {
    userSettings = await prisma.userSetting.findUnique({
      where: { userId }
    });
  }

  // Get user rating history
  const userRatings = await prisma.userRating.findMany({
    where: userId ? { userId } : undefined,
    include: {
      article: {
        include: {
          source: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 100 // Consider last 100 ratings for preference learning
  });

  // Get user interaction history for enhanced personalization
  const userInteractions = await prisma.userInteraction.findMany({
    where: userId ? { userId } : undefined,
    orderBy: {
      createdAt: 'desc'
    },
    take: 200 // Consider last 200 interactions
  });

  // Get collaborative filtering recommendations
  let collaborativeArticleIds: string[] = [];
  if (userId && userRatings.length >= 3) {
    const similarUsers = await findSimilarUsers(userId, 3);
    if (similarUsers.length > 0) {
      // Get highly rated articles from similar users that current user hasn't rated
      const similarUserRatings = await prisma.userRating.findMany({
        where: {
          userId: { in: similarUsers },
          rating: { gte: 4 }, // Only consider highly rated articles
          articleId: {
            notIn: userRatings.map((r: { articleId: string; rating: number }) => r.articleId)
          }
        },
        select: { articleId: true },
        take: 50
      });
      collaborativeArticleIds = similarUserRatings.map((r: { articleId: string }) => r.articleId);
    }
  }

  // Get topic clusters for diversity
  const topicClusters = await getTopicClusters(10);
  const diverseArticleIds: string[] = [];
  topicClusters.forEach((clusterArticles: string[]) => {
    // Take 1-2 articles from each cluster for diversity
    const sampleSize = Math.min(2, clusterArticles.length);
    for (let i = 0; i < sampleSize; i++) {
      if (diverseArticleIds.length < 20) {
        diverseArticleIds.push(clusterArticles[i]);
      }
    }
  });

  // Build user preference profile
  const preferredCelebrities = new Map<string, number>();
  const preferredCategories = new Map<string, number>();
  const preferredSources = new Map<string, number>();
  
  let highRatingCount = 0;
  let lowRatingCount = 0;
  
  userRatings.forEach((rating: { rating: number; article: { celebrities: string[]; categories: string[]; source: { name: string } } }) => {
    const weight = rating.rating >= 4 ? 1 : (rating.rating <= 2 ? -1 : 0);
    
    if (weight > 0) highRatingCount++;
    if (weight < 0) lowRatingCount++;
    
    // Track celebrity preferences
    rating.article.celebrities.forEach((celeb: string) => {
      preferredCelebrities.set(
        celeb,
        (preferredCelebrities.get(celeb) || 0) + weight
      );
    });
    
    // Track category preferences
    rating.article.categories.forEach((cat: string) => {
      preferredCategories.set(
        cat,
        (preferredCategories.get(cat) || 0) + weight
      );
    });
    
    // Track source preferences
    preferredSources.set(
      rating.article.source.name,
      (preferredSources.get(rating.article.source.name) || 0) + weight
    );
  });

  // Analyze user interaction patterns for enhanced personalization
  const interactionPatterns = new Map<string, { views: number, clicks: number, avgDuration: number }>();
  const articleInteractions = new Map<string, string[]>(); // articleId -> interaction types
  
  userInteractions.forEach((interaction: { articleId: string; interactionType: string; duration: number | null }) => {
    const key = `${interaction.articleId}`;
    const patterns = interactionPatterns.get(key) || { views: 0, clicks: 0, avgDuration: 0 };
    
    if (interaction.interactionType === 'view') {
      patterns.views++;
      if (interaction.duration) {
        patterns.avgDuration = (patterns.avgDuration + interaction.duration) / 2; // Simple average
      }
    } else if (interaction.interactionType === 'click') {
      patterns.clicks++;
    }
    
    interactionPatterns.set(key, patterns);
    
    // Track interaction types per article
    const types = articleInteractions.get(interaction.articleId) || [];
    if (!types.includes(interaction.interactionType)) {
      types.push(interaction.interactionType);
      articleInteractions.set(interaction.articleId, types);
    }
  });
  
  // Add explicit user preferences with high weight
  if (userSettings) {
    userSettings.preferredCelebrities.forEach((celeb: string) => {
      preferredCelebrities.set(
        celeb,
        (preferredCelebrities.get(celeb) || 0) + 5 // High weight for explicit preferences
      );
    });
    
    userSettings.preferredCategories.forEach((cat: string) => {
      preferredCategories.set(
        cat,
        (preferredCategories.get(cat) || 0) + 3 // Moderate weight for explicit preferences
      );
    });
  }
  
  // Get recent articles (not already rated)
  const ratedArticleIds = userRatings.map((r: { articleId: string; rating: number }) => r.articleId);
  
  let articles = await prisma.article.findMany({
    where: {
      archived: false,
      id: {
        notIn: ratedArticleIds.slice(0, 50) // Exclude recently rated articles
      }
    },
    include: {
      source: true,
      userRatings: true
    },
    orderBy: {
      publishDate: 'desc'
    },
    take: 100 // Get more articles to score and filter
  });
  
  // If no user ratings yet, return articles sorted by credibility and recency
  if (userRatings.length === 0) {
    return articles
      .sort((a: ArticleWithScore, b: ArticleWithScore) => {
        // Sort by credibility * recency
        const scoreA = a.credibilityRating * (1 / (Date.now() - a.publishDate.getTime()));
        const scoreB = b.credibilityRating * (1 / (Date.now() - b.publishDate.getTime()));
        return scoreB - scoreA;
      })
      .slice(offset, offset + limit)
      .map((a: ArticleWithScore) => ({ ...a, score: a.credibilityRating }));
  }
  
  // Pre-calculate community interaction counts for all articles
  const articleIds = articles.map((a: ArticleWithScore) => a.id);
  const communityInteractionCounts = new Map<string, number>();
  
  for (const articleId of articleIds) {
    const count = await prisma.userInteraction.count({
      where: {
        articleId,
        interactionType: { in: ['view', 'click'] }
      }
    });
    communityInteractionCounts.set(articleId, count);
  }
  
  // Score articles based on user preferences
  const scoredArticles = articles.map((article: ArticleWithScore) => {
    let score = 0;
    
    // Base score from credibility rating (0-10)
    score += article.credibilityRating;
    
    // Celebrity match score (0-20 points)
    let celebrityScore = 0;
    article.celebrities.forEach((celeb: string) => {
      const preference = preferredCelebrities.get(celeb) || 0;
      celebrityScore += preference * 2; // Weight celebrity matches heavily
    });
    score += Math.max(-10, Math.min(20, celebrityScore)); // Cap between -10 and +20
    
    // Category match score (0-10 points)
    let categoryScore = 0;
    article.categories.forEach((cat: string) => {
      const preference = preferredCategories.get(cat) || 0;
      categoryScore += preference;
    });
    score += Math.max(-5, Math.min(10, categoryScore)); // Cap between -5 and +10
    
    // Source preference score (0-10 points)
    const sourcePreference = preferredSources.get(article.source.name) || 0;
    score += Math.max(-5, Math.min(10, sourcePreference * 2)); // Cap between -5 and +10
    
    // Recency bonus (0-5 points)
    const ageInHours = (Date.now() - article.publishDate.getTime()) / (1000 * 60 * 60);
    if (ageInHours < 24) {
      score += 5 * (1 - ageInHours / 24); // Linear decay over 24 hours
    }
    
    // Global rating bonus (if others rated it highly)
    if (article.userRatings.length > 0) {
      const avgRating = article.userRatings.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / article.userRatings.length;
      score += (avgRating - 3) * 2; // +/- 4 points based on community rating
    }
    
    // Interaction-based personalization (0-15 points)
    const interactionData = interactionPatterns.get(article.id);
    if (interactionData) {
      // Boost articles user has viewed (shows interest)
      if (interactionData.views > 0) {
        score += Math.min(3, interactionData.views); // Up to +3 for multiple views
      }
      
      // Boost articles user has clicked (shows strong interest)
      if (interactionData.clicks > 0) {
        score += Math.min(5, interactionData.clicks * 2); // Up to +5 for clicks
      }
      
      // Boost articles where user spent time (engagement)
      if (interactionData.avgDuration > 10) { // Spent more than 10 seconds
        score += Math.min(7, interactionData.avgDuration / 10); // Up to +7 for engagement
      }
    }
    
    // Community engagement bonus (articles popular with others)
    const communityInteractions = communityInteractionCounts.get(article.id) || 0;
    if (communityInteractions > 5) {
      score += Math.min(5, communityInteractions / 5); // Up to +5 for community popularity
    }
    
    return { ...article, score };
  });
  
  // Sort by score (highest first)
  scoredArticles.sort((a: ArticleWithScore, b: ArticleWithScore) => (b.score || 0) - (a.score || 0));
  
  // Return paginated results
  return scoredArticles.slice(offset, offset + limit);
}

// Get user statistics
export async function getUserStats() {
  const totalRatings = await prisma.userRating.count();
  const totalArticles = await prisma.article.count();
  
  const ratings = await prisma.userRating.findMany({
    include: {
      article: true
    }
  });
  
  if (ratings.length === 0) {
    return {
      totalRatings: 0,
      totalArticles,
      averageRating: 0,
      topCelebrities: [],
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
  
  // Calculate average rating
  const averageRating = ratings.reduce((sum: number, r: { rating: number; article: { celebrities: string[]; categories: string[] } }) => sum + r.rating, 0) / ratings.length;
  
  // Get top celebrities
  const celebrityCounts = new Map<string, number>();
  ratings.forEach((rating: { rating: number; article: { celebrities: string[]; categories: string[] } }) => {
    if (rating.rating >= 4) {
      rating.article.celebrities.forEach((celeb: string) => {
        celebrityCounts.set(celeb, (celebrityCounts.get(celeb) || 0) + 1);
      });
    }
  });
  
  const topCelebrities = Array.from(celebrityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
  
  // Rating distribution
  const ratingDistribution = ratings.reduce((dist: Record<number, number>, r: { rating: number; article: { celebrities: string[]; categories: string[] } }) => {
    dist[r.rating] = (dist[r.rating] || 0) + 1;
    return dist;
  }, {} as Record<number, number>);
  
  return {
    totalRatings,
    totalArticles,
    averageRating: Math.round(averageRating * 10) / 10,
    topCelebrities,
    ratingDistribution
  };
}
