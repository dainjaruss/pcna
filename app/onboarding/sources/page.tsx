'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'

const CATEGORIES = [
  { id: 'celebrity-gossip', name: 'Celebrity Gossip', icon: '👑', description: 'Hollywood news, red carpet events, celebrity relationships' },
  { id: 'sports', name: 'Sports', icon: '⚽', description: 'Athletes, games, championships, sports entertainment' },
  { id: 'technology', name: 'Technology', icon: '💻', description: 'Tech news, gadgets, innovations, Silicon Valley' },
  { id: 'military-news', name: 'Military News', icon: '🎖️', description: 'Defense, veterans, military affairs, national security' },
  { id: 'government-politics', name: 'Government & Politics', icon: '🏛️', description: 'Politics, policy, government news, elections' },
  { id: 'home-improvement', name: 'Home Improvement', icon: '🏠', description: 'DIY, renovations, home design, real estate' },
  { id: 'home-decorating', name: 'Home Decorating', icon: '🛋️', description: 'Interior design, furniture, home styling' },
  { id: 'business-finance', name: 'Business & Finance', icon: '💼', description: 'Markets, economy, entrepreneurship, finance' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', description: 'Movies, TV shows, streaming, pop culture' },
  { id: 'health-wellness', name: 'Health & Wellness', icon: '🏥', description: 'Medical news, fitness, nutrition, mental health' },
  { id: 'science', name: 'Science', icon: '🔬', description: 'Research, discoveries, space, environment' },
  { id: 'travel', name: 'Travel', icon: '✈️', description: 'Destinations, tourism, adventure, vacation' },
  { id: 'food-cooking', name: 'Food & Cooking', icon: '🍳', description: 'Recipes, restaurants, cuisine, food trends' },
  { id: 'fashion-beauty', name: 'Fashion & Beauty', icon: '👗', description: 'Style, makeup, fashion trends, beauty tips' },
  { id: 'gaming', name: 'Gaming', icon: '🎮', description: 'Video games, esports, gaming culture' }
]

export default function CategorySelectionPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [celebrityInput, setCelebrityInput] = useState('')
  const [preferredCelebrities, setPreferredCelebrities] = useState<string[]>([])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleContinue = async () => {
    if (selectedCategories.length !== 5) return

    setIsSubmitting(true)
    try {
      const payload = {
        preferredCategories: selectedCategories,
        preferredCelebrities
      }

      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      sessionStorage.setItem('onboarding_categories', JSON.stringify(selectedCategories))
      router.push('/onboarding/sources/recommendations')
    } catch (error) {
      console.error('Error proceeding:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addCelebrity = () => {
    const candidate = celebrityInput.trim()
    if (!candidate || preferredCelebrities.includes(candidate)) return
    setPreferredCelebrities(prev => [...prev, candidate])
    setCelebrityInput('')
  }

  const removeCelebrity = (name: string) => {
    setPreferredCelebrities(prev => prev.filter(celeb => celeb !== name))
  }

  const handleCelebrityKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addCelebrity()
    }
  }

  const handleSkip = () => {
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Welcome to Pop Culture News! 🎉
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
            Let&apos;s personalize your news experience
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            Select 5 categories that interest you most
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category.id)
              return (
                <button
                  key={category.id}
                  onClick={() => toggleCategory(category.id)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{category.icon}</span>
                    <h3 className={`font-semibold ${isSelected ? 'text-purple-700 dark:text-purple-300' : ''}`}>
                      {category.name}
                    </h3>
                    {isSelected && (
                      <div className="ml-auto w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {category.description}
                  </p>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedCategories.length} of 5 categories selected
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleSkip}
                className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Skip for now
              </button>
              <button
                onClick={handleContinue}
                disabled={selectedCategories.length !== 5 || isSubmitting}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? 'Saving preferences...' : 'Continue →'}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Preferred celebrities (optional)</label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tell us a few names you care about and we&apos;ll bump those stories higher in your feed and emails.
            </p>
            <div className="flex gap-2">
              <input
                value={celebrityInput}
                onChange={(e) => setCelebrityInput(e.target.value)}
                onKeyDown={handleCelebrityKeyDown}
                placeholder="e.g. Beyoncé, Drake"
                className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addCelebrity}
                disabled={!celebrityInput.trim()}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {preferredCelebrities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {preferredCelebrities.map((name) => (
                  <span key={name} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200 text-sm">
                    {name}
                    <button onClick={() => removeCelebrity(name)} className="text-purple-600 dark:text-purple-300 hover:text-red-500 transition-colors" aria-label={`Remove ${name}`}>
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Don&apos;t worry, you can change your preferences anytime in Settings
          </p>
        </div>
      </div>
    </div>
  )
}