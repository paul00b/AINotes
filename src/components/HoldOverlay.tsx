import { useState, useEffect, useCallback } from 'react'
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

  const handlePointerMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isRecording) return
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    setThumbPos({ x: clientX, y: clientY })
  }, [isRecording])

  useEffect(() => {
    if (!isRecording && transcript) {
      setEditedText(transcript)
    }
  }, [isRecording, transcript])

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

  return (
    <div
      className="fixed inset-0 z-50"
      onMouseUp={isRecording ? onRelease : undefined}
      onMouseMove={isRecording ? handlePointerMove : undefined}
      onTouchEnd={isRecording ? (e) => { e.preventDefault(); onRelease() } : undefined}
      onTouchMove={isRecording ? handlePointerMove : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
        onClick={!isRecording ? handleCancel : undefined}
      />

      {/* Waveform above thumb */}
      {isRecording && thumbPos && (
        <div
          className="absolute pointer-events-none z-[60]"
          style={{
            left: thumbPos.x,
            top: thumbPos.y - 100,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="flex items-end gap-[3px] justify-center">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className="w-[3px] rounded-full"
                style={{
                  background: 'linear-gradient(to top, #10b981, #34d399)',
                  animation: `waveBar 0.4s ease-in-out ${i * 0.06}s infinite alternate`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bottom sheet — 60vh, glassy */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[55] rounded-t-3xl flex flex-col animate-[sheetUp_0.3s_ease-out] overflow-hidden"
        style={{
          height: '60vh',
          backgroundColor: 'rgba(255,255,255,0.65)',
          backdropFilter: 'blur(40px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
          boxShadow: '0 -8px 50px rgba(0,0,0,0.08)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300/80" />
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="px-6 pt-2 pb-1 flex items-center justify-center gap-2 shrink-0">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-xs text-gray-500">{t('voice.releaseToStop')}</p>
          </div>
        )}

        {/* Hint when editing */}
        {!isRecording && (
          <div className="px-6 pt-2 pb-1 text-center shrink-0">
            <p className="text-xs text-gray-400">{t('voice.editBeforeSending')}</p>
          </div>
        )}

        {/* Text content — scrollable, fills available space */}
        <div className="flex-1 px-6 overflow-y-auto">
          {isRecording ? (
            <div className="py-3">
              {transcript ? (
                <p className="text-[15px] text-gray-800 leading-relaxed whitespace-pre-wrap">{transcript}</p>
              ) : (
                <p className="text-[15px] text-gray-400 italic">{t('voice.listening')}</p>
              )}
            </div>
          ) : (
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              autoFocus
              className="w-full h-full bg-transparent text-[15px] text-gray-800 leading-relaxed outline-none resize-none py-3 placeholder:text-gray-400"
              style={{ caretColor: '#10b981' }}
            />
          )}
        </div>

        {/* Actions — only after release */}
        {!isRecording && (
          <div className="px-6 pb-8 pt-3 flex gap-3 shrink-0">
            <button
              onClick={handleCancel}
              className="flex-1 py-3 rounded-2xl text-sm font-medium text-gray-500 bg-white/60 hover:bg-white/80 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!editedText.trim()}
              className="flex-1 py-3 rounded-2xl text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('common.confirm')}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes waveBar {
          from { height: 6px; }
          to { height: 28px; }
        }
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
