import { NextRequest, NextResponse } from 'next/server';
import { allowRequest } from '@/lib/rate-limiter';
import { handleApiError } from '@/lib/error-handling';

export const dynamic = 'force-dynamic'

interface WebSearchResult {
  title: string
  url: string
  snippet: string
  displayUrl: string
}

// GET /api/web-search - Search the web using DuckDuckGo
export async function GET(request: NextRequest) {
  // Rate limit web search requests
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || 'unknown'
  const key = `rl:web-search:${ip}`
  const allowed = await allowRequest(key, 10, 60) // 10 web searches per minute
  if (!allowed) {
    return NextResponse.json({ error: 'Too many web search requests, try again later' }, { status: 429 })
  }

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Use DuckDuckGo's instant answer API (free, no API key required)
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'PopCultureNews/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo API returned ${response.status}`);
    }

    const data = await response.json();

    // Transform DuckDuckGo results to our format
    const results: WebSearchResult[] = [];

    // Add the instant answer if available
    if (data.Answer) {
      results.push({
        title: data.Answer,
        url: data.AnswerURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        snippet: data.Answer,
        displayUrl: data.AnswerURL || 'duckduckgo.com'
      });
    }

    // Add abstract if available
    if (data.Abstract) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        snippet: data.Abstract,
        displayUrl: data.AbstractURL ? new URL(data.AbstractURL).hostname : 'duckduckgo.com'
      });
    }

    // Add related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      data.RelatedTopics.slice(0, 5).forEach((topic: any) => {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text,
            url: topic.FirstURL,
            snippet: topic.Text,
            displayUrl: new URL(topic.FirstURL).hostname
          });
        }
      });
    }

    // Add results from the Results array
    if (data.Results && Array.isArray(data.Results)) {
      data.Results.slice(0, 5).forEach((result: any) => {
        results.push({
          title: result.Text,
          url: result.FirstURL,
          snippet: result.Text,
          displayUrl: new URL(result.FirstURL).hostname
        });
      });
    }

    // If no results from structured data, try to get some basic web results
    if (results.length === 0) {
      // Fallback: just return a link to search DuckDuckGo
      results.push({
        title: `Search results for "${query}"`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        snippet: `Click to see web search results for "${query}" on DuckDuckGo`,
        displayUrl: 'duckduckgo.com'
      });
    }

    return NextResponse.json({
      query,
      results: results.slice(0, 10), // Limit to 10 results
      source: 'DuckDuckGo'
    });
  } catch (error) {
    return handleApiError(error, 'webSearch')
  }
}