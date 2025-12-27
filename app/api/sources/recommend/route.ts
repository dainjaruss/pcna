import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'

// Mock AI-powered source recommendations
// In production, this would call an actual AI service like Abacus.AI
const SOURCE_DATABASE = {
  'celebrity-gossip': [
    { name: 'MediaTakeOut', description: 'Leading source for celebrity news and entertainment gossip', websiteUrl: 'https://mediatakeout.com', rssUrl: 'https://mediatakeout.com/feed', credibilityRating: 7 },
    { name: 'The Shade Room', description: 'Premier destination for Black entertainment news and culture', websiteUrl: 'https://theshaderoom.com', rssUrl: 'https://theshaderoom.com/feed', credibilityRating: 8 },
    { name: 'TMZ', description: 'Breaking celebrity news and entertainment stories', websiteUrl: 'https://tmz.com', rssUrl: 'https://tmz.com/rss.xml', credibilityRating: 6 },
    { name: 'E! News', description: 'Entertainment news, celebrity interviews, and red carpet coverage', websiteUrl: 'https://eonline.com', rssUrl: 'https://eonline.com/rss.xml', credibilityRating: 7 },
    { name: 'People Magazine', description: 'Celebrity news, photos, and entertainment stories', websiteUrl: 'https://people.com', rssUrl: 'https://people.com/feed', credibilityRating: 8 }
  ],
  'sports': [
    { name: 'ESPN', description: 'Comprehensive sports news, scores, and analysis', websiteUrl: 'https://espn.com', rssUrl: 'https://espn.com/espn/rss/news', credibilityRating: 9 },
    { name: 'Sports Illustrated', description: 'In-depth sports journalism and athlete profiles', websiteUrl: 'https://si.com', rssUrl: 'https://si.com/rss', credibilityRating: 8 },
    { name: 'Bleacher Report', description: 'Sports news, highlights, and fan discussions', websiteUrl: 'https://bleacherreport.com', rssUrl: 'https://bleacherreport.com/rss.xml', credibilityRating: 7 }
  ],
  'technology': [
    { name: 'TechCrunch', description: 'Technology news, startup coverage, and industry analysis', websiteUrl: 'https://techcrunch.com', rssUrl: 'https://techcrunch.com/feed', credibilityRating: 9 },
    { name: 'The Verge', description: 'Technology, science, art, and culture coverage', websiteUrl: 'https://theverge.com', rssUrl: 'https://theverge.com/rss/index.xml', credibilityRating: 9 },
    { name: 'Wired', description: 'Technology, science, and culture magazine', websiteUrl: 'https://wired.com', rssUrl: 'https://wired.com/feed/rss', credibilityRating: 8 }
  ],
  'military-news': [
    { name: 'Military.com', description: 'Military news, benefits, and veteran resources', websiteUrl: 'https://military.com', rssUrl: 'https://military.com/rss.xml', credibilityRating: 8 },
    { name: 'Stars and Stripes', description: 'Independent news source for the U.S. military community', websiteUrl: 'https://stripes.com', rssUrl: 'https://stripes.com/rss.xml', credibilityRating: 8 },
    { name: 'Federal News Network', description: 'Government and military news and analysis', websiteUrl: 'https://federalnewsnetwork.com', rssUrl: 'https://federalnewsnetwork.com/feed', credibilityRating: 7 }
  ],
  'government-politics': [
    { name: 'Politico', description: 'Political news and government analysis', websiteUrl: 'https://politico.com', rssUrl: 'https://politico.com/rss/politics.xml', credibilityRating: 9 },
    { name: 'The Hill', description: 'Congressional and political news', websiteUrl: 'https://thehill.com', rssUrl: 'https://thehill.com/rss.xml', credibilityRating: 8 },
    { name: 'Roll Call', description: 'Congressional news and policy analysis', websiteUrl: 'https://rollcall.com', rssUrl: 'https://rollcall.com/rss.xml', credibilityRating: 8 }
  ],
  'home-improvement': [
    { name: 'This Old House', description: 'Home improvement, renovation, and DIY projects', websiteUrl: 'https://thisoldhouse.com', rssUrl: 'https://thisoldhouse.com/feed', credibilityRating: 8 },
    { name: 'Bob Vila', description: 'Home improvement advice and project guides', websiteUrl: 'https://bobvila.com', rssUrl: 'https://bobvila.com/feed', credibilityRating: 7 },
    { name: 'Family Handyman', description: 'DIY home improvement and repair guides', websiteUrl: 'https://familyhandyman.com', rssUrl: 'https://familyhandyman.com/feed', credibilityRating: 8 }
  ],
  'home-decorating': [
    { name: 'Houzz', description: 'Home design, decorating, and remodeling ideas', websiteUrl: 'https://houzz.com', rssUrl: 'https://houzz.com/rss.xml', credibilityRating: 7 },
    { name: 'Apartment Therapy', description: 'Home design, organization, and lifestyle', websiteUrl: 'https://apartmenttherapy.com', rssUrl: 'https://apartmenttherapy.com/feed', credibilityRating: 8 },
    { name: 'Elle Decor', description: 'Luxury home design and interior decorating', websiteUrl: 'https://elledecor.com', rssUrl: 'https://elledecor.com/feed', credibilityRating: 8 }
  ],
  'business-finance': [
    { name: 'Bloomberg', description: 'Financial news, market data, and business analysis', websiteUrl: 'https://bloomberg.com', rssUrl: 'https://bloomberg.com/feed', credibilityRating: 9 },
    { name: 'Wall Street Journal', description: 'Business and financial news', websiteUrl: 'https://wsj.com', rssUrl: 'https://wsj.com/rss.xml', credibilityRating: 9 },
    { name: 'Forbes', description: 'Business, investing, and entrepreneurship news', websiteUrl: 'https://forbes.com', rssUrl: 'https://forbes.com/feed', credibilityRating: 8 }
  ],
  'entertainment': [
    { name: 'Variety', description: 'Entertainment news and industry analysis', websiteUrl: 'https://variety.com', rssUrl: 'https://variety.com/feed', credibilityRating: 9 },
    { name: 'Hollywood Reporter', description: 'Entertainment industry news and analysis', websiteUrl: 'https://hollywoodreporter.com', rssUrl: 'https://hollywoodreporter.com/feed', credibilityRating: 9 },
    { name: 'Entertainment Weekly', description: 'TV, movie, music, and pop culture news', websiteUrl: 'https://ew.com', rssUrl: 'https://ew.com/rss.xml', credibilityRating: 8 }
  ],
  'health-wellness': [
    { name: 'Health.com', description: 'Health, fitness, and wellness information', websiteUrl: 'https://health.com', rssUrl: 'https://health.com/feed', credibilityRating: 8 },
    { name: 'WebMD', description: 'Medical news and health information', websiteUrl: 'https://webmd.com', rssUrl: 'https://webmd.com/rss.xml', credibilityRating: 8 },
    { name: 'Well+Good', description: 'Health, wellness, and lifestyle content', websiteUrl: 'https://wellandgood.com', rssUrl: 'https://wellandgood.com/feed', credibilityRating: 7 }
  ],
  'science': [
    { name: 'Scientific American', description: 'Science news, research, and analysis', websiteUrl: 'https://scientificamerican.com', rssUrl: 'https://scientificamerican.com/feed', credibilityRating: 9 },
    { name: 'Science Magazine', description: 'Peer-reviewed scientific research and news', websiteUrl: 'https://sciencemag.org', rssUrl: 'https://sciencemag.org/rss.xml', credibilityRating: 9 },
    { name: 'National Geographic', description: 'Science, exploration, and environmental news', websiteUrl: 'https://nationalgeographic.com', rssUrl: 'https://nationalgeographic.com/rss.xml', credibilityRating: 8 }
  ],
  'travel': [
    { name: 'Travel + Leisure', description: 'Travel guides, destination reviews, and tips', websiteUrl: 'https://travelandleisure.com', rssUrl: 'https://travelandleisure.com/feed', credibilityRating: 8 },
    { name: 'Condé Nast Traveler', description: 'Luxury travel, destinations, and experiences', websiteUrl: 'https://cntraveler.com', rssUrl: 'https://cntraveler.com/feed', credibilityRating: 8 },
    { name: 'Lonely Planet', description: 'Travel guides and destination information', websiteUrl: 'https://lonelyplanet.com', rssUrl: 'https://lonelyplanet.com/rss.xml', credibilityRating: 7 }
  ],
  'food-cooking': [
    { name: 'Food Network', description: 'Recipes, cooking shows, and food entertainment', websiteUrl: 'https://foodnetwork.com', rssUrl: 'https://foodnetwork.com/rss.xml', credibilityRating: 8 },
    { name: 'Bon Appétit', description: 'Recipes, cooking techniques, and food culture', websiteUrl: 'https://bonappetit.com', rssUrl: 'https://bonappetit.com/feed', credibilityRating: 8 },
    { name: 'AllRecipes', description: 'User-generated recipes and cooking community', websiteUrl: 'https://allrecipes.com', rssUrl: 'https://allrecipes.com/feed', credibilityRating: 7 }
  ],
  'fashion-beauty': [
    { name: 'Vogue', description: 'Fashion, beauty, and lifestyle coverage', websiteUrl: 'https://vogue.com', rssUrl: 'https://vogue.com/rss.xml', credibilityRating: 9 },
    { name: 'Elle', description: 'Fashion, beauty, and women\'s lifestyle', websiteUrl: 'https://elle.com', rssUrl: 'https://elle.com/rss.xml', credibilityRating: 8 },
    { name: 'Allure', description: 'Beauty, fashion, and wellness content', websiteUrl: 'https://allure.com', rssUrl: 'https://allure.com/feed', credibilityRating: 8 }
  ],
  'gaming': [
    { name: 'IGN', description: 'Video game reviews, news, and entertainment', websiteUrl: 'https://ign.com', rssUrl: 'https://ign.com/rss.xml', credibilityRating: 8 },
    { name: 'GameSpot', description: 'Video game news, reviews, and features', websiteUrl: 'https://gamespot.com', rssUrl: 'https://gamespot.com/feeds/news', credibilityRating: 8 },
    { name: 'Polygon', description: 'Gaming culture, reviews, and industry news', websiteUrl: 'https://polygon.com', rssUrl: 'https://polygon.com/rss/index.xml', credibilityRating: 8 }
  ]
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const auth = getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { categories } = await request.json()

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json({ error: 'Categories are required' }, { status: 400 })
    }

    // Collect sources from selected categories
    const recommendedSources: any[] = []
    const usedSources = new Set<string>()

    // For each selected category, get up to 3 sources
    for (const categoryId of categories) {
      const categorySources = SOURCE_DATABASE[categoryId as keyof typeof SOURCE_DATABASE]
      if (categorySources) {
        // Shuffle and take up to 3 sources from this category
        const shuffled = [...categorySources].sort(() => Math.random() - 0.5)
        const selectedFromCategory = shuffled.slice(0, 3)

        for (const source of selectedFromCategory) {
          if (!usedSources.has(source.name)) {
            recommendedSources.push({
              name: source.name,
              description: source.description,
              category: getCategoryDisplayName(categoryId),
              credibilityRating: source.credibilityRating,
              websiteUrl: source.websiteUrl,
              rssUrl: source.rssUrl
            })
            usedSources.add(source.name)
          }
        }
      }
    }

    // If we don't have enough sources, fill with popular general sources
    while (recommendedSources.length < 20) {
      const generalSources = [
        { name: 'BBC News', description: 'International news and current events', category: 'General News', credibilityRating: 9, websiteUrl: 'https://bbc.com/news', rssUrl: 'https://bbc.com/news/rss.xml' },
        { name: 'CNN', description: 'Breaking news and current events', category: 'General News', credibilityRating: 8, websiteUrl: 'https://cnn.com', rssUrl: 'https://cnn.com/rss.xml' },
        { name: 'Reuters', description: 'Global news and financial information', category: 'General News', credibilityRating: 9, websiteUrl: 'https://reuters.com', rssUrl: 'https://reuters.com/rss.xml' },
        { name: 'Associated Press', description: 'Fact-based news and wire service', category: 'General News', credibilityRating: 9, websiteUrl: 'https://apnews.com', rssUrl: 'https://apnews.com/rss.xml' },
        { name: 'NPR', description: 'Public radio news and analysis', category: 'General News', credibilityRating: 9, websiteUrl: 'https://npr.org', rssUrl: 'https://npr.org/rss.xml' }
      ]

      for (const source of generalSources) {
        if (!usedSources.has(source.name) && recommendedSources.length < 20) {
          recommendedSources.push(source)
          usedSources.add(source.name)
        }
      }
      break // Prevent infinite loop
    }

    // Shuffle the final list
    const shuffled = recommendedSources.sort(() => Math.random() - 0.5)

    return NextResponse.json({
      sources: shuffled.slice(0, 20) // Return up to 20 sources
    })

  } catch (error) {
    console.error('Error generating source recommendations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getCategoryDisplayName(categoryId: string): string {
  const categoryMap: Record<string, string> = {
    'celebrity-gossip': 'Celebrity Gossip',
    'sports': 'Sports',
    'technology': 'Technology',
    'military-news': 'Military News',
    'government-politics': 'Government & Politics',
    'home-improvement': 'Home Improvement',
    'home-decorating': 'Home Decorating',
    'business-finance': 'Business & Finance',
    'entertainment': 'Entertainment',
    'health-wellness': 'Health & Wellness',
    'science': 'Science',
    'travel': 'Travel',
    'food-cooking': 'Food & Cooking',
    'fashion-beauty': 'Fashion & Beauty',
    'gaming': 'Gaming'
  }
  return categoryMap[categoryId] || categoryId
}