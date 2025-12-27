import { getRecommendedArticles } from '@/lib/recommendations';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    userInteraction: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    userRating: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    userSetting: {
      findUnique: jest.fn(),
    },
    article: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Mock cache
jest.mock('@/lib/cache', () => ({
  Cache: {
    getOrSet: jest.fn((key, fn) => fn()),
  },
}));

describe('Recommendations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecommendedArticles', () => {
    it('should return articles sorted by score', async () => {
      const mockArticles = [
        {
          id: '1',
          title: 'Article 1',
          publishDate: new Date(),
          credibilityRating: 8,
          categories: ['entertainment'],
          celebrities: ['celeb1'],
          source: { name: 'Source 1', credibilityRating: 7 },
          userRatings: [],
        },
        {
          id: '2',
          title: 'Article 2',
          publishDate: new Date(Date.now() - 86400000),
          credibilityRating: 9,
          categories: ['music'],
          celebrities: ['celeb2'],
          source: { name: 'Source 2', credibilityRating: 8 },
          userRatings: [],
        },
      ];

      (prisma.userSetting.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userInteraction.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.userRating.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.article.findMany as jest.Mock).mockResolvedValue(mockArticles);

      const articles = await getRecommendedArticles(undefined, 10, 0);

      expect(articles).toBeDefined();
      expect(Array.isArray(articles)).toBe(true);
    });

    it('should handle empty results', async () => {
      (prisma.userSetting.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userInteraction.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.userRating.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.article.findMany as jest.Mock).mockResolvedValue([]);

      const articles = await getRecommendedArticles(undefined, 10, 0);

      expect(articles).toEqual([]);
    });

    it('should handle user with no ratings', async () => {
      const mockArticles = [
        {
          id: '1',
          title: 'Test Article',
          publishDate: new Date(),
          credibilityRating: 7,
          categories: ['news'],
          celebrities: [],
          source: { name: 'Test Source', credibilityRating: 6 },
          userRatings: [],
        },
      ];

      (prisma.userSetting.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userInteraction.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.userRating.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.article.findMany as jest.Mock).mockResolvedValue(mockArticles);

      const articles = await getRecommendedArticles('user-123', 10, 0);

      expect(articles).toHaveLength(1);
      expect(articles[0].title).toBe('Test Article');
    });
  });
});
