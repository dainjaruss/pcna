'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'

interface RecommendedSource {
  name: string
  description: string
  category: string
  credibilityRating: number
  websiteUrl: string
  rssUrl?: string
}

const CATEGORIES = [
  { id: 'celebrity-gossip', name: 'Celebrity Gossip', icon: '👑' },
  { id: 'sports', name: 'Sports', icon: '⚽' },
  { id: 'technology', name: 'Technology', icon: '💻' },
  { id: 'military-news', name: 'Military News', icon: '🎖️' },
  { id: 'government-politics', name: 'Government & Politics', icon: '🏛️' },
  { id: 'home-improvement', name: 'Home Improvement', icon: '🏠' },
  { id: 'home-decorating', name: 'Home Decorating', icon: '🛋️' },
  { id: 'business-finance', name: 'Business & Finance', icon: '💼' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'health-wellness', name: 'Health & Wellness', icon: '🏥' },
  { id: 'science', name: 'Science', icon: '🔬' },
  { id: 'travel', name: 'Travel', icon: '✈️' },
  { id: 'food-cooking', name: 'Food & Cooking', icon: '🍳' },
  { id: 'fashion-beauty', name: 'Fashion & Beauty', icon: '👗' },
  { id: 'gaming', name: 'Gaming', icon: '🎮' }
]

export default function SourceRecommendationsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [recommendedSources, setRecommendedSources] = useState<RecommendedSource[]>([])
  const [selectedSources, setSelectedSources] = useState<Set<number>>(new Set())
  const [loadingSources, setLoadingSources] = useState(true)
  const [savingSources, setSavingSources] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    // Get selected categories from session storage
    const categories = sessionStorage.getItem('onboarding_categories')
    if (!categories) {
      router.push('/onboarding/sources')
      return
    }

    const parsedCategories = JSON.parse(categories)
    setSelectedCategories(parsedCategories)
    fetchRecommendations(parsedCategories)
  }, [user, loading, router])

  const fetchRecommendations = async (categories: string[]) => {
    try {
      const response = await fetch('/api/sources/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ categories })
      })

      if (response.ok) {
        const data = await response.json()
        setRecommendedSources(data.sources || [])
      } else {
        console.error('Failed to fetch recommendations')
        // Fallback to some default sources
        setRecommendedSources([
          {
            name: 'MediaTakeOut',
            description: 'Leading source for celebrity news and entertainment gossip',
            category: 'Celebrity Gossip',
            credibilityRating: 7,
            websiteUrl: 'https://mediatakeout.com',
            rssUrl: 'https://mediatakeout.com/feed'
          },
          {
            name: 'The Shade Room',
            description: 'Premier destination for Black entertainment news and culture',
            category: 'Celebrity Gossip',
            credibilityRating: 8,
            websiteUrl: 'https://theshaderoom.com',
            rssUrl: 'https://theshaderoom.com/feed'
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    } finally {
      setLoadingSources(false)
    }
  }

  const toggleSource = (index: number) => {
    const newSelected = new Set(selectedSources)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedSources(newSelected)
  }

  const handleAddSources = async () => {
    if (selectedSources.size === 0) return

    setSavingSources(true)
    try {
      const sourcesToAdd = Array.from(selectedSources).map(index => recommendedSources[index])

      // Add sources to database
      for (const source of sourcesToAdd) {
        try {
          await fetch('/api/sources', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: source.name,
              url: source.websiteUrl,
              rssUrl: source.rssUrl,
              credibilityRating: source.credibilityRating,
              type: 'rss'
            })
          })
        } catch (error) {
          console.error(`Failed to add source ${source.name}:`, error)
        }
      }

      // Clear session storage
      sessionStorage.removeItem('onboarding_categories')

      // Redirect to main app
      router.push('/')
    } catch (error) {
      console.error('Error saving sources:', error)
    } finally {
      setSavingSources(false)
    }
  }

  const getCategoryIcon = (categoryName: string) => {
    const category = CATEGORIES.find(c => c.name === categoryName)
    return category?.icon || '📰'
  }

  const getCredibilityColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600 dark:text-green-400'
    if (rating >= 6) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  if (loading || loadingSources) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {loadingSources ? 'Finding the best sources for you...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            🎯 Personalized News Sources
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
            Based on your interests, here are some great sources to follow
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {selectedCategories.map(categoryId => {
              const category = CATEGORIES.find(c => c.id === categoryId)
              return category ? (
                <span key={categoryId} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">
                  {category.icon} {category.name}
                </span>
              ) : null
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {recommendedSources.map((source, index) => {
            const isSelected = selectedSources.has(index)
            return (
              <div
                key={index}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'border-purple-500 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                }`}
                onClick={() => toggleSource(index)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getCategoryIcon(source.category)}</span>
                    <h3 className="font-semibold text-lg">{source.name}</h3>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isSelected
                      ? 'bg-purple-500 border-purple-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {isSelected && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>

                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                  {source.description}
                </p>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {source.category}
                  </span>
                  <span className={`font-medium ${getCredibilityColor(source.credibilityRating)}`}>
                    ⭐ {source.credibilityRating}/10
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="text-lg">
              <span className="font-medium">{selectedSources.size}</span> of <span className="font-medium">{recommendedSources.length}</span> sources selected
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Skip for now
              </button>
              <button
                onClick={handleAddSources}
                disabled={selectedSources.size === 0 || savingSources}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {savingSources ? 'Adding Sources...' : `Add ${selectedSources.size} Source${selectedSources.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You can always add or remove sources later in Settings
          </p>
        </div>
      </div>
    </div>
  )
}