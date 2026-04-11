import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

interface VoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (text: string) => void
}

export function VoiceModal({ isOpen, onClose, onSubmit }: VoiceModalProps) {
  const { t, i18n } = useTranslation()
  const { isListening, transcript, isSupported, start, stop, reset } = useSpeechRecognition()
  const [manualText, setManualText] = useState('')

  const lang = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-US'

  function handleMicClick() {
    if (isListening) {
      stop()
    } else {
      start(lang)
    }
  }

  function handleSubmit() {
    const text = transcript || manualText
    if (text.trim()) {
      reset()
      setManualText('')
      onSubmit(text.trim())
    }
  }

  function handleCancel() {
    reset()
    setManualText('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="glass rounded-3xl w-full max-w-lg p-6 space-y-6 animate-[slideUp_0.3s_ease-out]">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-800">
            {isListening ? t('voice.listening') : t('voice.tapToStart')}
          </h2>
          {isListening && (
            <p className="text-sm text-gray-400 mt-1">{t('voice.tapToStop')}</p>
          )}
        </div>

        {/* Mic button */}
        <div className="flex justify-center">
          <button
            onClick={handleMicClick}
            className="relative"
          >
            {isListening && (
              <>
                <div className="absolute inset-0 -m-4 rounded-full bg-emerald-400/20 animate-pulse-ring" />
                <div className="absolute inset-0 -m-4 rounded-full bg-emerald-400/10 animate-pulse-ring [animation-delay:0.5s]" />
              </>
            )}
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-red-500 animate-mic-pulse'
                  : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              {isListening ? (
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              )}
            </div>
          </button>
        </div>

        {/* Transcript display */}
        {transcript && (
          <div className="bg-white/80 rounded-2xl p-4 min-h-[80px] max-h-[200px] overflow-y-auto">
            <p className="text-sm text-gray-700 leading-relaxed">{transcript}</p>
          </div>
        )}

        {/* Manual text fallback */}
        {!isSupported && (
          <div className="space-y-2">
            <p className="text-xs text-amber-600 text-center">{t('voice.notSupported')}</p>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder={t('voice.textPlaceholder')}
              className="w-full bg-white/80 rounded-2xl p-4 text-sm text-gray-700 outline-none resize-none h-24 placeholder:text-gray-400"
            />
          </div>
        )}

        {/* Manual text input (always available when not listening and no transcript) */}
        {isSupported && !isListening && !transcript && (
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder={t('voice.textPlaceholder')}
            className="w-full bg-white/80 rounded-2xl p-4 text-sm text-gray-700 outline-none resize-none h-20 placeholder:text-gray-400"
          />
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!transcript && !manualText.trim()}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('ai.organizing')}
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
