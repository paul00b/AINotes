import { useState, useRef, useCallback } from 'react'

interface SpeechRecognitionHook {
  isListening: boolean
  transcript: string
  isSupported: boolean
  start: (lang?: string) => void
  stop: () => void
  reset: () => void
}

// Type declarations for Web Speech API
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance
    webkitSpeechRecognition: new () => SpeechRecognitionInstance
  }
}

const SpeechRecognitionAPI = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null

export function useSpeechRecognition(): SpeechRecognitionHook {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const finalTranscriptRef = useRef('')
  const sessionIdRef = useRef(0)
  const retryCountRef = useRef(0)
  const langRef = useRef('fr-FR')
  const shouldBeListeningRef = useRef(false)

  const isSupported = SpeechRecognitionAPI !== null

  const startInternal = useCallback((lang: string, currentSession: number) => {
    if (!SpeechRecognitionAPI) return

    // Always create a fresh instance to avoid stale results on restart
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null
      recognitionRef.current.onerror = null
      recognitionRef.current.onend = null
      try { recognitionRef.current.abort() } catch { /* already stopped */ }
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = lang

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (sessionIdRef.current !== currentSession) return

      let currentFinal = ''
      let currentInterim = ''

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          currentFinal += result[0].transcript
        } else {
          currentInterim += result[0].transcript
        }
      }

      if (currentFinal) {
        finalTranscriptRef.current += currentFinal
      }

      setTranscript(finalTranscriptRef.current + currentInterim)
      retryCountRef.current = 0
    }

    recognition.onerror = (event) => {
      if (sessionIdRef.current !== currentSession) return
      console.warn('Speech recognition error:', event.error)

      if ((event.error === 'network' || event.error === 'service-not-allowed') && retryCountRef.current < 3) {
        retryCountRef.current++
        return // let onend handle the restart
      }

      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        shouldBeListeningRef.current = false
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      if (sessionIdRef.current !== currentSession) return

      // Auto-restart with a fresh instance if we should still be listening
      if (shouldBeListeningRef.current && retryCountRef.current <= 3) {
        startInternal(lang, currentSession)
        return
      }

      shouldBeListeningRef.current = false
      setIsListening(false)
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
      setIsListening(true)
      shouldBeListeningRef.current = true
    } catch (err) {
      console.error('Failed to start speech recognition:', err)
      shouldBeListeningRef.current = false
      setIsListening(false)
    }
  }, [])

  const start = useCallback((lang = 'fr-FR') => {
    if (!SpeechRecognitionAPI) return

    if (recognitionRef.current) {
      recognitionRef.current.onresult = null
      recognitionRef.current.onerror = null
      recognitionRef.current.onend = null
      try { recognitionRef.current.abort() } catch { /* already stopped */ }
      recognitionRef.current = null
    }

    shouldBeListeningRef.current = false
    retryCountRef.current = 0
    langRef.current = lang
    const currentSession = ++sessionIdRef.current

    finalTranscriptRef.current = ''
    setTranscript('')

    startInternal(lang, currentSession)
  }, [startInternal])

  const stop = useCallback(() => {
    shouldBeListeningRef.current = false
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  const reset = useCallback(() => {
    shouldBeListeningRef.current = false
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null
      recognitionRef.current.onerror = null
      recognitionRef.current.onend = null
      try { recognitionRef.current.abort() } catch { /* already stopped */ }
      recognitionRef.current = null
    }
    sessionIdRef.current++
    retryCountRef.current = 0
    finalTranscriptRef.current = ''
    setTranscript('')
    setIsListening(false)
  }, [])

  return { isListening, transcript, isSupported, start, stop, reset }
}
