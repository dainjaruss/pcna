import fetch from 'node-fetch'

export async function summarizeText(text: string, opts: { model?: string } = {}) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    // Fallback: return first 200 chars
    return text.slice(0, 200) + (text.length > 200 ? '…' : '')
  }

  // Minimal OpenAI call (example). Users must set OPENAI_API_KEY in env.
  const payload = {
    model: opts.model || 'gpt-4o-mini',
    messages: [{ role: 'user', content: `Summarize the following text in one short paragraph:\n\n${text}` }],
    max_tokens: 200,
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`OpenAI error: ${res.status} ${txt}`)
  }
  const json: any = await res.json()
  return json?.choices?.[0]?.message?.content || ''
}
