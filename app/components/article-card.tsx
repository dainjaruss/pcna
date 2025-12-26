'use client'

import { useState } from 'react'
import Image from 'next/image'

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
  }
  userRatings: Array<{ rating: number }>
  celebrities: string[]
}

interface ArticleCardProps {
  article: Article
  onRatingUpdate?: () => void
}

export function ArticleCard({ article, onRatingUpdate }: ArticleCardProps) {
  const [rating, setRating] = useState<number | null>(null)
  const [isRating, setIsRating] = useState(false)
  const [showFullSummary, setShowFullSummary] = useState(false)

  const userRating = article.userRatings.length > 0
    ? article.userRatings[article.userRatings.length - 1].rating
    : null

  const handleRating = async (newRating: number) => {
    if (isRating) return

    setIsRating(true)
    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          rating: newRating
        })
      })

      if (response.ok) {
        setRating(newRating)
        onRatingUpdate?.()
      }
    } catch (error) {
      console.error('Error rating article:', error)
    } finally {
      setIsRating(false)
    }
  }

  const currentRating = rating || userRating
  const publishDate = new Date(article.publishDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  const summary = article.summary.length > 150 && !showFullSummary
    ? article.summary.slice(0, 150) + '...'
    : article.summary

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow">
      {article.imageUrl && (
        <div className="relative w-full h-48 bg-gray-200 dark:bg-gray-700">
          <Image
            src={article.imageUrl}
            alt={article.title}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
            {article.source.name}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-600 dark:text-gray-400">Credibility:</span>
            <span className="text-xs font-bold text-green-600 dark:text-green-400">
              {article.credibilityRating}/10
            </span>
          </div>
        </div>

        <h3 className="text-lg font-bold mb-2 line-clamp-2 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
          <a href={article.url} target="_blank" rel="noopener noreferrer">
            {article.title}
          </a>
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {summary}
          {article.summary.length > 150 && (
            <button
              onClick={() => setShowFullSummary(!showFullSummary)}
              className="ml-1 text-purple-600 dark:text-purple-400 hover:underline"
            >
              {showFullSummary ? 'Show less' : 'Show more'}
            </button>
          )}
        </p>

        {article.celebrities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {article.celebrities.slice(0, 3).map((celeb, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200"
              >
                {celeb}
              </span>
            ))}
            {article.celebrities.length > 3 && (
              <span className="text-xs px-2 py-1 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200">
                +{article.celebrities.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">{publishDate}</span>
          
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-600 dark:text-gray-400 mr-1">
              {currentRating ? 'Your rating:' : 'Rate:'}
            </span>
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => handleRating(star)}
                disabled={isRating}
                className="text-lg hover:scale-110 transition-transform disabled:cursor-not-allowed"
                title={`Rate ${star} stars`}
              >
                {star <= (currentRating || 0) ? '⭐' : '☆'}
              </button>
            ))}
          </div>
        </div>

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block w-full text-center py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
        >
          Read Full Article →
        </a>
      </div>
    </div>
  )
}
