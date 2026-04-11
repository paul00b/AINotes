import { useState } from 'react'
import { organizeWithAI, organizeOffline, type AIResponse } from '../lib/ai'
import type { TaskList } from '../lib/db'
import { STORAGE_KEYS } from '../lib/constants'

export function useAI() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<AIResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function process(text: string, existingLists: TaskList[], lang: string) {
    setIsProcessing(true)
    setError(null)
    setResult(null)

    try {
      const apiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY)

      let response: AIResponse
      if (apiKey) {
        response = await organizeWithAI(text, existingLists, lang)
      } else {
        // Fallback to offline
        response = organizeOffline(text, lang)
      }

      setResult(response)
      return response
    } catch (err) {
      // Try offline fallback on API error
      try {
        const fallback = organizeOffline(text, lang)
        setResult(fallback)
        return fallback
      } catch {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        return null
      }
    } finally {
      setIsProcessing(false)
    }
  }

  function reset() {
    setResult(null)
    setError(null)
  }

  return { isProcessing, result, error, process, reset }
}
