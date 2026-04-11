import { useState, useEffect } from 'react'
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

  // Sync transcript into editable text when recording stops
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
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onMouseUp={isRecording ? onRelease : undefined}
      onTouchEnd={isRecording ? (e) => { e.preventDefault(); onRelease() } : undefined}
    >
      <div className="glass rounded-3xl w-full max-w-lg p-6 space-y-5 animate-[slideUp_0.3s_ease-out]">
        {isRecording ? (
          <>
            {/* Recording state */}
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-800">{t('voice.listening')}</h2>
              <p className="text-sm text-gray-400 mt-1">{t('voice.releaseToStop')}</p>
            </div>

            {/* Live waveform indicator */}
            <div className="flex justify-center">
              <div className="flex items-center gap-1 h-12">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-emerald-500 rounded-full animate-pulse"
                    style={{
                      height: `${20 + Math.random() * 28}px`,
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: '0.6s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Live transcript */}
            {transcript && (
              <div className="bg-white/80 rounded-2xl p-4 min-h-[60px] max-h-[200px] overflow-y-auto">
                <p className="text-sm text-gray-700 leading-relaxed">{transcript}</p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Editing state */}
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
          </>
        )}
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
