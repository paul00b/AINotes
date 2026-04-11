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

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (sessionIdRef.current !== currentSession) return

      // Rebuild full transcript from all results to avoid duplication
      // on Samsung Internet and other browsers with quirky resultIndex
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      finalTranscriptRef.current = finalTranscript
      setTranscript(finalTranscript + interimTranscript)
      // Successful result — reset retry counter
      retryCountRef.current = 0
    }

    recognition.onerror = (event) => {
      if (sessionIdRef.current !== currentSession) return
      console.warn('Speech recognition error:', event.error)

      // On network/service errors, auto-retry up to 3 times
      if ((event.error === 'network' || event.error === 'service-not-allowed') && retryCountRef.current < 3) {
        retryCountRef.current++
        console.log(`Retrying speech recognition (${retryCountRef.current}/3)...`)
        return // let onend handle the restart
      }

      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        shouldBeListeningRef.current = false
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      if (sessionIdRef.current !== currentSession) return

      // Auto-restart if we should still be listening (network hiccup, Chrome timeout, etc.)
      if (shouldBeListeningRef.current && retryCountRef.current <= 3) {
        try {
          recognition.start()
          return
        } catch {
          // Can't restart — fall through to stop
        }
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

    // Kill any existing session cleanly
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
