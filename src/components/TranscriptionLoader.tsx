import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface TranscriptionLoaderProps {
  phase: 'transcribing' | 'organizing'
}

export function TranscriptionLoader({ phase }: TranscriptionLoaderProps) {
  const { t } = useTranslation()
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (phase === 'transcribing') {
      setProgress(0)
    } else if (phase === 'organizing') {
      setProgress(55)
    }
  }, [phase])

  useEffect(() => {
    const target = phase === 'transcribing' ? 45 : 90
    const step = phase === 'transcribing' ? 0.8 : 1.2

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= target) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          return prev
        }
        return prev + step
      })
    }, 100)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [phase])

  const label = phase === 'transcribing'
    ? t('voice.transcribing')
    : t('ai.organizing')

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass rounded-3xl p-8 w-full max-w-xs space-y-5">
        {/* Spinner */}
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mx-auto" />

        {/* Label + percentage */}
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="text-2xl font-bold text-emerald-500 tabular-nums">
            {Math.round(progress)}%
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-200/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-200 ease-out"
            style={{ width: `${Math.round(progress)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
