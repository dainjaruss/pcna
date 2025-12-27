'use client'

import { useState, useEffect } from 'react'

interface SearchFilters {
  query: string
  source: string
  dateFrom: string
  dateTo: string
  category: string
}

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void
  isSearching: boolean
}

export function SearchBar({ onSearch, isSearching }: SearchBarProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    source: '',
    dateFrom: '',
    dateTo: '',
    category: ''
  })
  const [sources, setSources] = useState<Array<{id: string, name: string}>>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    // Fetch available sources for filter dropdown
    fetch('/api/sources')
      .then(res => res.json())
      .then(data => setSources(data.map((s: any) => ({ id: s.id, name: s.name }))))
      .catch(err => console.error('Error fetching sources:', err))
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(filters)
  }

  const handleClear = () => {
    const clearedFilters = {
      query: '',
      source: '',
      dateFrom: '',
      dateTo: '',
      category: ''
    }
    setFilters(clearedFilters)
    onSearch(clearedFilters)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Search */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              placeholder="Search articles by keywords, celebrities, or topics..."
              className="w-full px-4 py-3 pl-12 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <div className="absolute left-3 top-3.5 text-gray-400">
              🔍
            </div>
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Advanced Filters Toggle */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
          >
            {showAdvanced ? '▼ Hide' : '▶ Show'} Advanced Filters
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium mb-2">Source</label>
              <select
                value={filters.source}
                onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">All Sources</option>
                {sources.map(source => (
                  <option key={source.id} value={source.id}>{source.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">All Categories</option>
                <option value="celebrity">Celebrity</option>
                <option value="entertainment">Entertainment</option>
                <option value="music">Music</option>
                <option value="movies">Movies</option>
                <option value="tv">TV</option>
                <option value="sports">Sports</option>
                <option value="news">News</option>
              </select>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}