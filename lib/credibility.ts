import fetch from 'node-fetch'

export interface CredibilityAnalysis {
  score: number // 1-10
  reason: string // 2-3 sentence explanation
  strengths: string[]
  concerns: string[]
  confidence: 'high' | 'medium' | 'low'
}

export async function analyzeSourceCredibility(
  sourceName: string,
  url: string,
  opts: { model?: string } = {}
): Promise<CredibilityAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    // Fallback: basic domain analysis
    return getBasicCredibilityAnalysis(sourceName, url)
  }

  try {
    // Extract domain for analysis
    const domain = new URL(url).hostname.replace('www.', '')

    const prompt = `Analyze the credibility of this news source: "${sourceName}" at ${url}.

Consider:
1. Domain reputation and history (${domain})
2. Content quality and journalistic standards
3. Fact-checking practices and corrections policy
4. Bias assessment (political, commercial, or other)
5. Transparency (author attribution, editorial standards)
6. Known issues, controversies, or fact-checking ratings
7. Social signals and expert endorsements

Provide a credibility score from 1-10 where:
- 9-10: Highly credible (major news organizations, fact-checked)
- 7-8: Generally reliable (established sources, minor bias)
- 5-6: Mixed reliability (some questionable content)
- 3-4: Low credibility (frequent misinformation, heavy bias)
- 1-2: Not credible (known for fake news, propaganda)

Format your response as JSON with this exact structure:
{
  "score": number,
  "reason": "2-3 sentence explanation",
  "strengths": ["key strength 1", "key strength 2"],
  "concerns": ["concern 1", "concern 2"],
  "confidence": "high|medium|low"
}`

    const payload = {
      model: opts.model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.3, // Lower temperature for more consistent analysis
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`OpenAI error: ${res.status} ${txt}`)
    }

    const json: any = await res.json()
    const content = json?.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // Parse the JSON response
    const analysis = JSON.parse(content.trim())

    // Validate the response structure
    if (typeof analysis.score !== 'number' || analysis.score < 1 || analysis.score > 10) {
      throw new Error('Invalid score in response')
    }

    return {
      score: Math.round(analysis.score),
      reason: analysis.reason || 'Analysis completed',
      strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
      concerns: Array.isArray(analysis.concerns) ? analysis.concerns : [],
      confidence: ['high', 'medium', 'low'].includes(analysis.confidence) ? analysis.confidence : 'medium'
    }

  } catch (error) {
    console.error('Error analyzing source credibility:', error)
    // Fallback to basic analysis
    return getBasicCredibilityAnalysis(sourceName, url)
  }
}

function getBasicCredibilityAnalysis(sourceName: string, url: string): CredibilityAnalysis {
  try {
    const domain = new URL(url).hostname.toLowerCase()

    // Basic domain-based scoring
    let score = 5
    let reason = 'Basic domain analysis performed. Limited information available.'
    const strengths: string[] = []
    const concerns: string[] = []

    // Known reliable domains
    const reliableDomains = [
      'bbc.com', 'bbc.co.uk', 'reuters.com', 'apnews.com', 'npr.org',
      'nytimes.com', 'washingtonpost.com', 'wsj.com', 'bloomberg.com',
      'politico.com', 'theguardian.com', 'cnn.com', 'foxnews.com'
    ]

    // Known unreliable domains
    const unreliableDomains = [
      'breitbart.com', 'dailymail.co.uk', 'infowars.com', 'naturalnews.com',
      'thegatewaypundit.com', 'zerohedge.com'
    ]

    if (reliableDomains.some(d => domain.includes(d))) {
      score = 8
      reason = 'Domain recognized as established news source with good reputation.'
      strengths.push('Established news organization', 'Professional domain')
    } else if (unreliableDomains.some(d => domain.includes(d))) {
      score = 3
      reason = 'Domain associated with questionable reporting practices.'
      concerns.push('History of biased reporting', 'Fact-checking concerns')
    } else {
      // Check for common patterns
      if (domain.includes('.edu') || domain.includes('.gov')) {
        score = 9
        reason = 'Educational or government domain suggests high credibility.'
        strengths.push('Official institution', 'Authoritative source')
      } else if (domain.includes('blogspot') || domain.includes('wordpress.com')) {
        score = 4
        reason = 'Blog platform detected. Credibility varies widely.'
        concerns.push('Unverified content', 'May lack editorial oversight')
      } else if (domain.includes('.org')) {
        score = 7
        reason = 'Non-profit organization domain.'
        strengths.push('Non-commercial', 'Potential expertise')
      }
    }

    return {
      score,
      reason,
      strengths,
      concerns,
      confidence: 'low' // Basic analysis has low confidence
    }

  } catch (error) {
    // Ultimate fallback
    return {
      score: 5,
      reason: 'Unable to analyze source. Defaulting to neutral rating.',
      strengths: [],
      concerns: ['Analysis failed'],
      confidence: 'low'
    }
  }
}