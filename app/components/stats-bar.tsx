'use client'

import { useEffect, useState } from 'react'

interface Stats {
  totalRatings: number
  totalArticles: number
  averageRating: number
  topCelebrities: Array<{ name: string; count: number }>
}

export function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/ratings')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-lg font-semibold mb-4">Your Stats</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {stats.totalArticles}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Articles</div>
        </div>
        
        <div className="text-center p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
          <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">
            {stats.totalRatings}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Your Ratings</div>
        </div>
        
        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Average Rating</div>
        </div>
      </div>
      
      {stats.topCelebrities.length > 0 && (
        <div className="mt-4 pt-4 border-t dark:border-gray-700">
          <h3 className="text-sm font-semibold mb-2">Your Favorite Celebrities</h3>
          <div className="flex flex-wrap gap-2">
            {stats.topCelebrities.slice(0, 5).map((celeb, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-800 dark:text-purple-200"
              >
                {celeb.name} ({celeb.count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
