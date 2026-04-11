import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface HoldOverlayProps {
  isRecording: boolean
  transcript: string
  onRelease: () => void
  onSubmit: (text: string) => void
  onCancel: () => void
}

export function HoldOverlay({ isRecording, transcript, onRelease, onSubmit, onCancel }: HoldOverlayProps) {
  const { t } = useTranslation()
  const [editedText, setEditedText] = useState('')
  const [thumbPos, setThumbPos] = useState<{ x: number; y: number } | null>(null)
  const animIdRef = useRef(0)

  // Track finger/mouse position during recording
  const handlePointerMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isRecording) return
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    setThumbPos({ x: clientX, y: clientY })
  }, [isRecording])

  // Sync transcript into editable text when recording stops
  useEffect(() => {
    if (!isRecording && transcript) {
      setEditedText(transcript)
    }
  }, [isRecording, transcript])

  // Animate waveform bars
  useEffect(() => {
    if (!isRecording) return
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate)
    }
    animIdRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animIdRef.current)
  }, [isRecording])

  function handleSubmit() {
    const text = editedText.trim()
    if (text) {
      onSubmit(text)
      setEditedText('')
    }
  }

  function handleCancel() {
    setEditedText('')
    onCancel()
  }

  if (isRecording) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onMouseUp={onRelease}
        onMouseMove={handlePointerMove}
        onTouchEnd={(e) => { e.preventDefault(); onRelease() }}
        onTouchMove={handlePointerMove}
      >
        {/* Transcript at the top */}
        <div className="absolute top-0 left-0 right-0 p-6 pt-14">
          <div className="max-w-lg mx-auto">
            <p className="text-xs text-white/60 text-center mb-2">{t('voice.releaseToStop')}</p>
            {transcript ? (
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 max-h-[40vh] overflow-y-auto">
                <p className="text-white text-sm leading-relaxed">{transcript}</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-white/40 text-sm">{t('voice.listening')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Waveform floating near thumb */}
        {thumbPos && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: thumbPos.x,
              top: thumbPos.y - 80,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="flex items-end gap-[3px] h-10 justify-center">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-[3px] bg-emerald-400 rounded-full"
                  style={{
                    animation: `waveBar 0.5s ease-in-out ${i * 0.08}s infinite alternate`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Fallback centered waveform if no position tracked yet */}
        {!thumbPos && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2">
            <div className="flex items-end gap-[3px] h-10 justify-center">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-[3px] bg-emerald-400 rounded-full"
                  style={{
                    animation: `waveBar 0.5s ease-in-out ${i * 0.08}s infinite alternate`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <style>{`
          @keyframes waveBar {
            from { height: 8px; }
            to { height: 32px; }
          }
        `}</style>
      </div>
    )
  }

  // Editing state after release
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="glass rounded-3xl w-full max-w-lg p-6 space-y-5 animate-[slideUp_0.3s_ease-out]">
        <div className="text-center">
          <p className="text-sm text-gray-400">{t('voice.editBeforeSending')}</p>
        </div>

        <textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          autoFocus
          className="w-full bg-white/80 rounded-2xl p-4 text-sm text-gray-700 outline-none resize-none h-28 placeholder:text-gray-400"
        />

        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!editedText.trim()}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
