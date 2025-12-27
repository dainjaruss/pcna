'use client'

import { useEffect, useState, useCallback } from 'react'
import { ArticleCard } from './article-card'

interface Article {
  id: string
  title: string
  summary: string
  url: string
  imageUrl: string | null
  credibilityRating: number
  publishDate: string
  source: {
    name: string
    credibilityRating: number
  }
  userRatings: Array<{ rating: number }>
  celebrities: string[]
  score?: number
  highlightedTitle?: string
  highlightedSummary?: string
}

interface SearchFilters {
  query: string
  source: string
  dateFrom: string
  dateTo: string
  category: string
}

interface ArticleGridProps {
  searchFilters?: SearchFilters | null
  isSearchMode?: boolean
}

interface WebSearchResult {
  title: string
  url: string
  snippet: string
  displayUrl: string
}

export function ArticleGrid({ searchFilters, isSearchMode = false }: ArticleGridProps) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [useRecommendations, setUseRecommendations] = useState(!isSearchMode)
  const [searchQuery, setSearchQuery] = useState<string | null>(null)
  const [showWebSearch, setShowWebSearch] = useState(false)
  const [webResults, setWebResults] = useState<WebSearchResult[]>([])
  const [webSearchLoading, setWebSearchLoading] = useState(false)
  const [webSearchSource, setWebSearchSource] = useState<string>('')

  useEffect(() => {
    if (searchFilters) {
      // Search mode - reset and fetch with filters
      setPage(1)
      setArticles([])
      fetchSearchResults(1)
    } else {
      // Normal mode
      fetchArticles()
    }
  }, [page, useRecommendations, searchFilters])

  const fetchArticles = useCallback(async () => {
    if (isSearchMode && searchFilters) return; // Don't fetch normal articles in search mode

    try {
      setLoading(true)
      const response = await fetch(
        `/api/articles?page=${page}&limit=20&recommended=${useRecommendations}`
      )
      
      if (response.ok) {
        const data = await response.json()
        if (page === 1) {
          setArticles(data.articles)
        } else {
          setArticles(prev => [...prev, ...data.articles])
        }
        setHasMore(data.pagination.page < data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Error fetching articles:', error)
    } finally {
      setLoading(false)
    }
  }, [isSearchMode, searchFilters, page, useRecommendations])

  const fetchSearchResults = useCallback(async (searchPage: number = 1) => {
    if (!searchFilters) return;

    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: searchPage.toString(),
        limit: '20'
      });

      if (searchFilters.query) params.append('query', searchFilters.query);
      if (searchFilters.source) params.append('source', searchFilters.source);
      if (searchFilters.dateFrom) params.append('dateFrom', searchFilters.dateFrom);
      if (searchFilters.dateTo) params.append('dateTo', searchFilters.dateTo);
      if (searchFilters.category) params.append('category', searchFilters.category);

      const response = await fetch(`/api/search?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        if (searchPage === 1) {
          setArticles(data.articles)
          setSearchQuery(data.query)
          setShowWebSearch(data.showWebSearch || false)
        } else {
          setArticles(prev => [...prev, ...data.articles])
        }
        setHasMore(data.pagination.page < data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Error searching articles:', error)
    } finally {
      setLoading(false)
    }
  }, [searchFilters])

  const performWebSearch = async () => {
    if (!searchQuery) return;

    setWebSearchLoading(true);
    try {
      const response = await fetch(`/api/web-search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setWebResults(data.results || []);
        setWebSearchSource(data.source || 'Web');
      } else {
        setWebResults([]);
      }
    } catch (error) {
      console.error('Error performing web search:', error);
      setWebResults([]);
    } finally {
      setWebSearchLoading(false);
    }
  }

  const saveWebResultToDatabase = async (result: WebSearchResult) => {
    try {
      // Create a basic article entry from the web result
      const articleData = {
        title: result.title,
        summary: result.snippet,
        url: result.url,
        content: result.snippet,
        publishDate: new Date().toISOString(),
        categories: ['web-search'],
        celebrities: []
      };

      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(articleData)
      });

      if (response.ok) {
        // Remove from web results and show success
        setWebResults(prev => prev.filter(r => r.url !== result.url));
        alert('Article saved to database!');
      } else {
        alert('Failed to save article');
      }
    } catch (error) {
      console.error('Error saving web result:', error);
      alert('Failed to save article');
    }
  }

  const handleRatingUpdate = () => {
    // Refresh articles after rating
    setPage(1)
    fetchArticles()
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1)
    }
  }

  const toggleRecommendations = () => {
    setUseRecommendations(prev => !prev)
    setPage(1)
  }

  if (loading && page === 1) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 dark:bg-gray-700 h-48 rounded-t-lg"></div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-b-lg">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Show:</span>
          <button
            onClick={toggleRecommendations}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              useRecommendations
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            ✨ Recommended
          </button>
          <button
            onClick={toggleRecommendations}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !useRecommendations
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            📅 Latest
          </button>
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {articles.length} articles
        </div>
      </div>

      {articles.length === 0 && !loading ? (
        <div className="text-center py-12">
          {isSearchMode && showWebSearch ? (
            <>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
                No articles found in our database for &quot;{searchQuery}&quot;.
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mb-6">
                Would you like to search the web instead?
              </p>
              <button
                onClick={performWebSearch}
                disabled={webSearchLoading}
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 mr-4"
              >
                {webSearchLoading ? '🔍 Searching...' : '🌐 Search the Web'}
              </button>
              <a
                href="/settings"
                className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Add Custom Sources
              </a>
            </>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
                {isSearchMode 
                  ? `No results found for your search.`
                  : 'No articles found. Try fetching news from the settings page.'
                }
              </p>
              <a
                href="/settings"
                className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Go to Settings
              </a>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                onRatingUpdate={handleRatingUpdate}
              />
            ))}
          </div>

          {/* Web Search Results */}
          {webResults.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6 text-center">
                🌐 Web Search Results from {webSearchSource}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {webResults.map((result, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow border-2 border-blue-200 dark:border-blue-800"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold mb-2 line-clamp-2">
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {result.title}
                            </a>
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {result.displayUrl}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
                        {result.snippet}
                      </p>

                      <div className="flex gap-2">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          View Article
                        </a>
                        <button
                          onClick={() => saveWebResultToDatabase(result)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                          title="Save to database"
                        >
                          💾 Save
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
