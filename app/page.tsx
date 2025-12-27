'use client'

import { useState } from 'react'
import { ArticleGrid } from './components/article-grid'
import { StatsBar } from './components/stats-bar'
import { SearchBar } from './components/search-bar'

interface SearchFilters {
  query: string
  source: string
  dateFrom: string
  dateTo: string
  category: string
}

export default function Home() {
  const [searchFilters, setSearchFilters] = useState<SearchFilters | null>(null)
  const [isSearching, setIsSearching] = useState(false)

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
      
      <SearchBar onSearch={handleSearch} isSearching={isSearching} />
      
      <StatsBar />
      
      <ArticleGrid searchFilters={searchFilters} isSearchMode={!!searchFilters} />
    </div>
  )
}
