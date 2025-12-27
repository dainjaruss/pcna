import { NextResponse } from 'next/server'
import { summarizeText } from '@/lib/summary'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const text = body.text || ''
    if (!text) return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    const summary = await summarizeText(text)
    return NextResponse.json({ summary })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to summarize' }, { status: 500 })
  }
}
