import useSWR from 'swr'

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
    credibilityReason?: string
  }
  userRatings: Array<{ rating: number }>
  celebrities: string[]
  score?: number
  highlightedTitle?: string
  highlightedSummary?: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  nextCursor?: string
}

interface ArticlesResponse {
  articles: Article[]
  pagination: Pagination
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useArticles(
  page: number = 1,
  limit: number = 20,
  useRecommendations: boolean = false,
  sourceId?: string,
  celebrity?: string
) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    recommended: useRecommendations.toString(),
  })

  if (sourceId) params.append('source', sourceId)
  if (celebrity) params.append('celebrity', celebrity)

  const { data, error, isLoading, mutate } = useSWR<ArticlesResponse>(
    `/api/articles?${params}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // 5 seconds
    }
  )

  return {
    articles: data?.articles || [],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  }
}

export function useRecommendations(userId?: string, limit: number = 20, offset: number = 0) {
  const params = new URLSearchParams({
    recommended: 'true',
    limit: limit.toString(),
  })

  if (offset > 0) params.append('offset', offset.toString())

  const { data, error, isLoading, mutate } = useSWR<ArticlesResponse>(
    `/api/articles?${params}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10 seconds for recommendations
    }
  )

  return {
    articles: data?.articles || [],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  }
}