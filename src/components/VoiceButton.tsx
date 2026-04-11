import { useRef, useCallback } from 'react'

interface VoiceButtonProps {
  onTap: () => void
  onHoldStart: () => void
  onHoldEnd: () => void
  isListening?: boolean
}

const HOLD_THRESHOLD = 300 // ms to distinguish tap from hold

export function VoiceButton({ onTap, onHoldStart, onHoldEnd, isListening = false }: VoiceButtonProps) {
  const pressStartRef = useRef(0)
  const isHoldingRef = useRef(false)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handlePressStart = useCallback(() => {
    pressStartRef.current = Date.now()
    isHoldingRef.current = false

    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true
      onHoldStart()
    }, HOLD_THRESHOLD)
  }, [onHoldStart])

  const handlePressEnd = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }

    if (isHoldingRef.current) {
      isHoldingRef.current = false
      onHoldEnd()
    } else {
      onTap()
    }
  }, [onTap, onHoldEnd])

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      {isListening && (
        <>
          <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-pulse-ring" />
          <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-pulse-ring [animation-delay:0.5s]" />
        </>
      )}

      <button
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={() => {
          if (isHoldingRef.current) handlePressEnd()
        }}
        onTouchStart={handlePressStart}
        onTouchEnd={(e) => {
          e.preventDefault()
          handlePressEnd()
        }}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95 select-none ${
          isListening
            ? 'bg-red-500 animate-mic-pulse shadow-red-200'
            : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200 hover:shadow-xl'
        }`}
      >
        {isListening ? (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>
    </div>
  )
}
