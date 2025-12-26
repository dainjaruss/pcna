import { ArticleGrid } from './components/article-grid'
import { StatsBar } from './components/stats-bar'

export default function Home() {
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
      
      <StatsBar />
      
      <ArticleGrid />
    </div>
  )
}
