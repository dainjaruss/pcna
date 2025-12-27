'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArticleGrid } from './components/article-grid'
import { StatsBar } from './components/stats-bar'
import { SearchBar } from './components/search-bar'
import { useAuth } from '@/lib/useAuth'

interface SearchFilters {
  query: string
  source: string
  dateFrom: string
  dateTo: string
  category: string
}

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [searchFilters, setSearchFilters] = useState<SearchFilters | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchLoading, setIsSearchLoading] = useState(false)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      checkOnboardingStatus()
    }
  }, [user, loading, router])

  const checkOnboardingStatus = async () => {
    try {
      // Check if user has any sources configured
      const response = await fetch('/api/sources')
      if (response.ok) {
        const data = await response.json()
        const userSources = data.sources.filter((source: any) => source.isCustom)

        // If user has no custom sources, redirect to onboarding
        if (userSources.length === 0) {
          router.push('/onboarding/sources')
          return
        }
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error)
    } finally {
      setCheckingOnboarding(false)
    }
  }

  const handleSearch = (filters: SearchFilters) => {
    // Check if any filter has a value
    const hasActiveFilters = Object.values(filters).some(value => value.trim() !== '')

    if (hasActiveFilters) {
      setSearchFilters(filters)
      setIsSearching(true)
    } else {
      setSearchFilters(null)
      setIsSearching(false)
    }
  }

  const handleSearchLoadingChange = useCallback((loading: boolean) => {
    setIsSearchLoading(loading)
  }, [])

  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          📰 Pop Culture News
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Your personalized feed of the latest celebrity gossip and entertainment news
        </p>
      </div>

      <SearchBar onSearch={handleSearch} isSearching={isSearching} isLoading={isSearchLoading} />

      <StatsBar />

      <ArticleGrid
        searchFilters={searchFilters}
        isSearchMode={!!searchFilters}
        onSearchLoadingChange={handleSearchLoadingChange}
      />
    </div>
  )
}
