import Parser from 'rss-parser';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { prisma } from './prisma';

interface FeedItem {
  title: string;
  link: string;
  pubDate?: string;
  contentSnippet?: string;
  content?: string;
  enclosure?: {
    url: string;
  };
  'media:content'?: {
    $: {
      url: string;
    };
  }[];
}

interface ParsedArticle {
  title: string;
  url: string;
  summary: string;
  content?: string;
  imageUrl?: string;
  publishDate: Date;
  categories: string[];
  celebrities: string[];
}

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media:content'],
      ['media:thumbnail', 'media:thumbnail'],
    ],
  },
});

// Celebrity keywords to detect (focusing on Black celebrities)
const CELEBRITY_KEYWORDS = [
  'beyonce', 'jay-z', 'rihanna', 'drake', 'kanye', 'kim kardashian',
  'cardi b', 'megan thee stallion', 'nicki minaj', 'lil wayne',
  'kendrick lamar', 'lebron james', 'serena williams', 'michael jordan',
  'oprah', 'tyler perry', 'denzel washington', 'will smith', 'jada pinkett',
  'kevin hart', 'chris rock', 'dave chappelle', 'tracee ellis ross',
  'issa rae', 'donald glover', 'michael b jordan', 'lupita nyongo',
  'zendaya', 'halle bailey', 'chloe bailey', 'lizzo', 'sza',
  'summer walker', 'doja cat', 'saweetie', 'city girls', 'moneybagg yo',
  'dababy', 'roddy ricch', 'polo g', 'lil baby', 'gunna',
  'offset', 'quavo', 'takeoff', 'migos', 'travis scott',
  'asap rocky', '21 savage', 'metro boomin', 'future', 'lil durk',
  'naomi campbell', 'iman', 'tyra banks', 'gabrielle union', 'taraji p henson',
  'angela bassett', 'viola davis', 'octavia spencer', 'regina king',
  'tiffany haddish', 'regina hall', 'janelle monae', 'keke palmer',
  'simone biles', 'naomi osaka', 'sha carri richardson', 'stephen curry',
  'russell westbrook', 'james harden', 'anthony davis', 'kevin durant'
];

// Extract celebrities from text
function extractCelebrities(text: string): string[] {
  const lowercaseText = text.toLowerCase();
  const found = new Set<string>();
  
  for (const celebrity of CELEBRITY_KEYWORDS) {
    if (lowercaseText.includes(celebrity)) {
      found.add(celebrity);
    }
  }
  
  return Array.from(found);
}

// Scrape MediaTakeOut
export async function scrapeMediaTakeOut(): Promise<ParsedArticle[]> {
  try {
    const response = await axios.get('https://mediatakeout.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const articles: ParsedArticle[] = [];
    
    // MediaTakeOut article selectors (may need adjustment based on site structure)
    $('article, .post, .entry').each((_, element) => {
      const $article = $(element);
      
      const title = $article.find('h2, h3, .entry-title, .post-title').first().text().trim();
      const link = $article.find('a').first().attr('href');
      const summary = $article.find('.entry-content, .post-content, p').first().text().trim().slice(0, 300);
      const imageUrl = $article.find('img').first().attr('src') || $article.find('img').first().attr('data-src');
      
      if (title && link) {
        const fullUrl = link.startsWith('http') ? link : `https://mediatakeout.com${link}`;
        const celebrities = extractCelebrities(`${title} ${summary}`);
        
        articles.push({
          title,
          url: fullUrl,
          summary: summary || title,
          imageUrl: imageUrl || undefined,
          publishDate: new Date(),
          categories: ['entertainment', 'celebrity'],
          celebrities
        });
      }
    });
    
    return articles.slice(0, 20); // Limit to 20 articles
  } catch (error) {
    console.error('Error scraping MediaTakeOut:', error);
    return [];
  }
}

// Fetch RSS feeds
export async function fetchRSSFeed(url: string): Promise<ParsedArticle[]> {
  try {
    const feed = await parser.parseURL(url);
    const articles: ParsedArticle[] = [];
    
    for (const item of feed.items as FeedItem[]) {
      if (!item.link) continue;
      
      let imageUrl: string | undefined;
      
      // Try to get image from various RSS formats
      if (item.enclosure?.url) {
        imageUrl = item.enclosure.url;
      } else if (item['media:content']?.[0]?.$?.url) {
        imageUrl = item['media:content'][0].$.url;
      }
      
      const fullText = `${item.title || ''} ${item.contentSnippet || ''}`;
      const celebrities = extractCelebrities(fullText);
      
      articles.push({
        title: item.title || 'Untitled',
        url: item.link,
        summary: item.contentSnippet?.slice(0, 300) || item.title || '',
        content: item.content,
        imageUrl,
        publishDate: item.pubDate ? new Date(item.pubDate) : new Date(),
        categories: ['entertainment'],
        celebrities
      });
    }
    
    return articles;
  } catch (error) {
    console.error(`Error fetching RSS feed ${url}:`, error);
    return [];
  }
}

// Main function to fetch all news
export async function fetchAllNews() {
  console.log('Starting news fetch...');
  
  try {
    // Get all enabled sources
    const sources = await prisma.source.findMany({
      where: { enabled: true }
    });
    
    const allArticles: Array<ParsedArticle & { sourceId: string; credibilityRating: number }> = [];
    
    for (const source of sources) {
      console.log(`Fetching from ${source.name}...`);
      
      let articles: ParsedArticle[] = [];
      
      if (source.type === 'scrape' && source.name === 'MediaTakeOut') {
        articles = await scrapeMediaTakeOut();
      } else if (source.type === 'rss' && source.rssUrl) {
        articles = await fetchRSSFeed(source.rssUrl);
      }
      
      // Add source info to articles
      for (const article of articles) {
        allArticles.push({
          ...article,
          sourceId: source.id,
          credibilityRating: source.credibilityRating
        });
      }
    }
    
    // Save articles to database (skip duplicates)
    let savedCount = 0;
    let skippedCount = 0;
    
    for (const article of allArticles) {
      try {
        await prisma.article.create({
          data: {
            title: article.title,
            summary: article.summary,
            content: article.content || article.summary,
            url: article.url,
            imageUrl: article.imageUrl,
            sourceId: article.sourceId,
            credibilityRating: article.credibilityRating,
            publishDate: article.publishDate,
            categories: article.categories,
            celebrities: article.celebrities
          }
        });
        savedCount++;
      } catch (error: any) {
        // Skip if article already exists (duplicate URL)
        if (error.code === 'P2002') {
          skippedCount++;
        } else {
          console.error('Error saving article:', error);
        }
      }
    }
    
    console.log(`News fetch complete. Saved: ${savedCount}, Skipped: ${skippedCount}`);
    return { savedCount, skippedCount, total: allArticles.length };
  } catch (error) {
    console.error('Error in fetchAllNews:', error);
    throw error;
  }
}

// Initialize default sources
export async function initializeDefaultSources() {
  const defaultSources = [
    {
      name: 'MediaTakeOut',
      url: 'https://mediatakeout.com',
      enabled: true,
      credibilityRating: 6,
      type: 'scrape'
    },
    {
      name: 'The Shade Room',
      url: 'https://theshaderoom.com',
      type: 'rss',
      rssUrl: 'https://theshaderoom.com/feed/',
      enabled: true,
      credibilityRating: 7
    },
    {
      name: 'Baller Alert',
      url: 'https://balleralert.com',
      type: 'rss',
      rssUrl: 'https://balleralert.com/feed/',
      enabled: true,
      credibilityRating: 7
    },
    {
      name: 'TMZ',
      url: 'https://www.tmz.com',
      type: 'rss',
      rssUrl: 'https://www.tmz.com/rss.xml',
      enabled: true,
      credibilityRating: 8
    },
    {
      name: 'E! News',
      url: 'https://www.eonline.com',
      type: 'rss',
      rssUrl: 'https://www.eonline.com/syndication/feeds/rssfeeds/topstories.xml',
      enabled: true,
      credibilityRating: 8
    },
    {
      name: 'People Magazine',
      url: 'https://people.com',
      type: 'rss',
      rssUrl: 'https://people.com/feed/',
      enabled: true,
      credibilityRating: 9
    },
    {
      name: 'Essence',
      url: 'https://www.essence.com',
      type: 'rss',
      rssUrl: 'https://www.essence.com/feed/',
      enabled: true,
      credibilityRating: 9
    },
    {
      name: 'The Root',
      url: 'https://www.theroot.com',
      type: 'rss',
      rssUrl: 'https://www.theroot.com/rss',
      enabled: true,
      credibilityRating: 8
    }
  ];
  
  for (const source of defaultSources) {
    try {
      await prisma.source.upsert({
        where: { name: source.name },
        update: {},
        create: source
      });
    } catch (error) {
      console.error(`Error creating source ${source.name}:`, error);
    }
  }
  
  console.log('Default sources initialized');
}
