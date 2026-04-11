import { useTranslation } from 'react-i18next'

interface VoiceButtonProps {
  onTap: () => void
  isRecording?: boolean
}

function haptic(ms = 50) {
  navigator.vibrate?.(ms)
}

export function VoiceButton({ onTap, isRecording = false }: VoiceButtonProps) {
  const { t } = useTranslation()

  function handleTap() {
    haptic(isRecording ? 80 : 50)
    onTap()
  }

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
      {/* Recording label */}
      {isRecording && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 backdrop-blur shadow-sm animate-[fadeIn_0.2s_ease-out]">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-medium text-gray-600">{t('voice.recording')}</span>
        </div>
      )}

      <div className="relative">
        {isRecording && (
          <>
            <div className="absolute inset-0 rounded-full bg-red-400/30 animate-pulse-ring" />
            <div className="absolute inset-0 rounded-full bg-red-400/20 animate-pulse-ring [animation-delay:0.5s]" />
          </>
        )}

        <button
          onClick={handleTap}
          onContextMenu={(e) => e.preventDefault()}
          className={`relative w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95 select-none ${
            isRecording
              ? 'bg-red-500 animate-mic-pulse shadow-red-200'
              : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200 hover:shadow-xl'
          }`}
        >
          {isRecording ? (
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
    </div>
  )
}
