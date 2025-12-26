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

// Get recommended articles based on user ratings
export async function getRecommendedArticles(
  limit: number = 20,
  offset: number = 0
): Promise<ArticleWithScore[]> {
  // Get user rating history
  const userRatings = await prisma.userRating.findMany({
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
  
  // Build user preference profile
  const preferredCelebrities = new Map<string, number>();
  const preferredCategories = new Map<string, number>();
  const preferredSources = new Map<string, number>();
  
  let highRatingCount = 0;
  let lowRatingCount = 0;
  
  userRatings.forEach(rating => {
    const weight = rating.rating >= 4 ? 1 : (rating.rating <= 2 ? -1 : 0);
    
    if (weight > 0) highRatingCount++;
    if (weight < 0) lowRatingCount++;
    
    // Track celebrity preferences
    rating.article.celebrities.forEach(celeb => {
      preferredCelebrities.set(
        celeb,
        (preferredCelebrities.get(celeb) || 0) + weight
      );
    });
    
    // Track category preferences
    rating.article.categories.forEach(cat => {
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
  
  // Get recent articles (not already rated)
  const ratedArticleIds = userRatings.map(r => r.articleId);
  
  let articles = await prisma.article.findMany({
    where: {
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
      .sort((a, b) => {
        // Sort by credibility * recency
        const scoreA = a.credibilityRating * (1 / (Date.now() - a.publishDate.getTime()));
        const scoreB = b.credibilityRating * (1 / (Date.now() - b.publishDate.getTime()));
        return scoreB - scoreA;
      })
      .slice(offset, offset + limit)
      .map(a => ({ ...a, score: a.credibilityRating }));
  }
  
  // Score articles based on user preferences
  const scoredArticles = articles.map(article => {
    let score = 0;
    
    // Base score from credibility rating (0-10)
    score += article.credibilityRating;
    
    // Celebrity match score (0-20 points)
    let celebrityScore = 0;
    article.celebrities.forEach(celeb => {
      const preference = preferredCelebrities.get(celeb) || 0;
      celebrityScore += preference * 2; // Weight celebrity matches heavily
    });
    score += Math.max(-10, Math.min(20, celebrityScore)); // Cap between -10 and +20
    
    // Category match score (0-10 points)
    let categoryScore = 0;
    article.categories.forEach(cat => {
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
      const avgRating = article.userRatings.reduce((sum, r) => sum + r.rating, 0) / article.userRatings.length;
      score += (avgRating - 3) * 2; // +/- 4 points based on community rating
    }
    
    return { ...article, score };
  });
  
  // Sort by score (highest first)
  scoredArticles.sort((a, b) => (b.score || 0) - (a.score || 0));
  
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
  const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
  
  // Get top celebrities
  const celebrityCounts = new Map<string, number>();
  ratings.forEach(rating => {
    if (rating.rating >= 4) {
      rating.article.celebrities.forEach(celeb => {
        celebrityCounts.set(celeb, (celebrityCounts.get(celeb) || 0) + 1);
      });
    }
  });
  
  const topCelebrities = Array.from(celebrityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
  
  // Rating distribution
  const ratingDistribution = ratings.reduce((dist, r) => {
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
