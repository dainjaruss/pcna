'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { ArticleCard } from './article-card'
import { useArticles } from '../../lib/hooks/use-articles'

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
  onSearchLoadingChange?: (loading: boolean) => void
}

interface WebSearchResult {
  title: string
  url: string
  snippet: string
  displayUrl: string
}

export function ArticleGrid({ searchFilters, isSearchMode = false, onSearchLoadingChange }: ArticleGridProps) {
  const [page, setPage] = useState(1)
  const [useRecommendations, setUseRecommendations] = useState(!isSearchMode)
  const [searchQuery, setSearchQuery] = useState<string | null>(null)
  const [showWebSearch, setShowWebSearch] = useState(false)
  const [webResults, setWebResults] = useState<WebSearchResult[]>([])
  const [webSearchLoading, setWebSearchLoading] = useState(false)
  const [webSearchSource, setWebSearchSource] = useState<string>('')
  const [webSearchError, setWebSearchError] = useState<string | null>(null)
  const [searchArticles, setSearchArticles] = useState<Article[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchHasMore, setSearchHasMore] = useState(true)

  const loadMoreRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Use SWR for data fetching with caching (only for non-search mode)
  const { articles, pagination, isLoading, error, mutate } = useArticles(
    page,
    20,
    useRecommendations,
    searchFilters?.source,
    searchFilters?.category
  )

  const hasMore = pagination ? pagination.page < pagination.totalPages : false

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isSearchMode) {
          setPage(prev => prev + 1)
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, isLoading, isSearchMode])

  const fetchSearchResults = useCallback(async (searchPage: number = 1) => {
    if (!searchFilters) return;

    try {
      setSearchLoading(true)
      onSearchLoadingChange?.(true)
      
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
          setSearchArticles(data.articles)
          setSearchQuery(data.query)
          setShowWebSearch(data.showWebSearch || false)
        } else {
          setSearchArticles(prev => [...prev, ...data.articles])
        }
        setSearchHasMore(data.pagination.page < data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Error searching articles:', error)
    } finally {
      setSearchLoading(false)
      onSearchLoadingChange?.(false)
    }
  }, [searchFilters, onSearchLoadingChange])

  useEffect(() => {
    if (!searchFilters) {
      setSearchArticles([])
      setSearchQuery(null)
      setShowWebSearch(false)
      setWebResults([])
      setWebSearchSource('')
      setWebSearchError(null)
      setSearchHasMore(true)
      setSearchLoading(false)
      onSearchLoadingChange?.(false)
      setPage(1)
      return
    }

    setPage(1)
    setSearchArticles([])
    setSearchQuery(null)
    setShowWebSearch(false)
    setWebResults([])
    setWebSearchSource('')
    setWebSearchError(null)
    setSearchHasMore(true)
    fetchSearchResults(1)
  }, [searchFilters, fetchSearchResults])

  const performWebSearch = async () => {
    const queryToSearch = (searchQuery || searchFilters?.query || '').trim()
    if (!queryToSearch) {
      setWebSearchError('Add search keywords to try the web fallback.')
      return
    }

    setWebSearchLoading(true)
    setWebResults([])
    setWebSearchError(null)

    try {
      const response = await fetch(`/api/web-search?q=${encodeURIComponent(queryToSearch)}`)

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message = payload?.error?.message || 'Web search temporarily unavailable.'
        throw new Error(message)
      }

      const data = await response.json()
      setWebSearchSource(data.source || 'DuckDuckGo')

      if (!Array.isArray(data.results) || data.results.length === 0) {
        setWebSearchError('No web search results were returned for that query.')
        setWebResults([])
        return
      }

      setWebResults(data.results)
      setWebSearchError(null)
    } catch (error) {
      console.error('Error performing web search:', error)
      const message = error instanceof Error ? error.message : 'Unable to perform the web search right now.'
      setWebSearchError(message)
      setWebResults([])
    } finally {
      setWebSearchLoading(false)
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
    // Refresh articles after rating using SWR mutate
    mutate()
  }

  const loadMore = () => {
    if (!isLoading && hasMore) {
      setPage(prev => prev + 1)
    }
  }

  const toggleRecommendations = () => {
    setUseRecommendations(prev => !prev)
    setPage(1)
    mutate() // Clear cache when switching modes
  }

  if (isLoading && page === 1) {
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
          {isSearchMode ? searchArticles.length : articles.length} articles
        </div>
      </div>

      {(isSearchMode ? searchArticles.length === 0 : articles.length === 0) && !(isSearchMode ? searchLoading : isLoading) ? (
        <div className="text-center py-12">
          {isSearchMode && showWebSearch && webResults.length === 0 ? (
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
              {webSearchError && (
                <p className="text-sm text-red-500 mt-4">
                  {webSearchError}
                </p>
              )}
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
            {(isSearchMode ? searchArticles : articles).map(article => (
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

          {(isSearchMode ? searchHasMore : hasMore) && !isSearchMode && (
            <div 
              ref={loadMoreRef} 
              className="mt-8 text-center py-4"
            >
              {isLoading && page > 1 && (
                <div className="inline-block px-8 py-3 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg">
                  Loading more articles...
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
