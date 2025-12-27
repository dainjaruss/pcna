'use client'

import { useEffect, useState } from 'react'
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

export function ArticleGrid({ searchFilters, isSearchMode = false }: ArticleGridProps) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [useRecommendations, setUseRecommendations] = useState(!isSearchMode)
  const [searchQuery, setSearchQuery] = useState<string | null>(null)

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

  const fetchArticles = async () => {
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
  }

  const fetchSearchResults = async (searchPage: number = 1) => {
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
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
            No articles found. Try fetching news from the settings page.
          </p>
          <a
            href="/settings"
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go to Settings
          </a>
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
