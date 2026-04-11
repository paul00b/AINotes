import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AIResponse, AIListResult } from '../lib/ai'

interface AIResultViewProps {
  result: AIResponse
  isProcessing: boolean
  error: string | null
  onConfirm: (result: AIResponse) => void
  onCancel: () => void
  onRetry: () => void
}

export function AIResultView({ result, isProcessing, error, onConfirm, onCancel, onRetry }: AIResultViewProps) {
  const { t } = useTranslation()
  const [editedResult, setEditedResult] = useState<AIResponse>(result)

  function removeTask(listIndex: number, taskIndex: number) {
    setEditedResult((prev) => {
      const newLists = prev.lists.map((list, i) => {
        if (i === listIndex) {
          return { ...list, tasks: list.tasks.filter((_, j) => j !== taskIndex) }
        }
        return list
      })
      return { lists: newLists.filter((l) => l.tasks.length > 0) }
    })
  }

  function removeList(listIndex: number) {
    setEditedResult((prev) => ({
      lists: prev.lists.filter((_, i) => i !== listIndex),
    }))
  }

  if (isProcessing) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="glass rounded-3xl p-8 text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-600">{t('ai.organizing')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
        <div className="glass rounded-3xl w-full max-w-lg p-6 space-y-4">
          <p className="text-sm text-red-500 text-center">{t('ai.error')}</p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-500 bg-gray-100">
              {t('common.cancel')}
            </button>
            <button onClick={onRetry} className="flex-1 py-3 rounded-xl text-sm font-medium text-white bg-emerald-500">
              {t('ai.retry')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!editedResult.lists.length) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="glass rounded-3xl w-full max-w-lg p-6 space-y-5 max-h-[80vh] overflow-y-auto animate-[slideUp_0.3s_ease-out]">
        <h2 className="text-lg font-semibold text-gray-800 text-center">
          {t('ai.confirmTitle')}
        </h2>

        <div className="space-y-4">
          {editedResult.lists.map((list: AIListResult, listIndex: number) => (
            <div key={listIndex} className="bg-white/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{list.icon}</span>
                  <span className="font-medium text-gray-800 text-sm">{list.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${list.isExisting ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                    {list.isExisting ? t('ai.existingList') : t('ai.newList')}
                  </span>
                </div>
                <button
                  onClick={() => removeList(listIndex)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-2">
                {list.tasks.map((task: string, taskIndex: number) => (
                  <div key={taskIndex} className="flex items-center gap-2 group">
                    <div className="w-5 h-5 rounded-md border-2 border-gray-200 flex-shrink-0" />
                    <span className="text-sm text-gray-600 flex-1">{task}</span>
                    <button
                      onClick={() => removeTask(listIndex, taskIndex)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {t('ai.cancel')}
          </button>
          <button
            onClick={() => onConfirm(editedResult)}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-colors"
          >
            {t('ai.confirm')}
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
