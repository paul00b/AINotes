import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { ListCard } from '../components/ListCard'
import { EmptyState } from '../components/EmptyState'
import { VoiceButton } from '../components/VoiceButton'
import { VoiceModal } from '../components/VoiceModal'
import { AIResultView } from '../components/AIResultView'
import { useLists } from '../hooks/useLists'
import { useTasks } from '../hooks/useTasks'
import { useAI } from '../hooks/useAI'
import { getColorForIndex } from '../lib/constants'
import type { AIResponse } from '../lib/ai'

export function HomePage() {
  const { t, i18n } = useTranslation()
  const { lists, addList, findListByName } = useLists()
  const { addTask } = useTasks()
  const { isProcessing, result, error, process, reset } = useAI()

  const [showVoiceModal, setShowVoiceModal] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [pendingText, setPendingText] = useState('')

  const handleVoiceSubmit = useCallback(async (text: string) => {
    setPendingText(text)
    setShowVoiceModal(false)
    setShowResult(true)
    await process(text, lists, i18n.language)
  }, [lists, i18n.language, process])

  const handleConfirm = useCallback(async (aiResult: AIResponse) => {
    for (const aiList of aiResult.lists) {
      let listId: string

      // Check if the list already exists
      const existing = await findListByName(aiList.name)
      if (existing) {
        listId = existing.id
      } else {
        const colorIndex = lists.length + aiResult.lists.indexOf(aiList)
        listId = await addList(aiList.name, aiList.icon, getColorForIndex(colorIndex).key)
      }

      // Add all tasks
      for (const taskText of aiList.tasks) {
        await addTask(taskText, listId)
      }
    }

    setShowResult(false)
    reset()
  }, [lists, addList, addTask, findListByName, reset])

  const handleCancel = useCallback(() => {
    setShowResult(false)
    reset()
  }, [reset])

  const handleRetry = useCallback(async () => {
    if (pendingText) {
      await process(pendingText, lists, i18n.language)
    }
  }, [pendingText, lists, i18n.language, process])

  return (
    <Layout>
      {/* Header */}
      <div className="px-6 pt-14 pb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">{t('home.myLists')}</h1>
        <Link
          to="/settings"
          className="w-10 h-10 rounded-xl bg-white/60 backdrop-blur flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </div>

      {/* Lists grid */}
      {lists.length > 0 ? (
        <div className="px-6 grid grid-cols-2 gap-4">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}

      {/* Voice FAB */}
      <VoiceButton onClick={() => setShowVoiceModal(true)} />

      {/* Voice Modal */}
      <VoiceModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onSubmit={handleVoiceSubmit}
      />

      {/* AI Result */}
      {showResult && (
        <AIResultView
          result={result ?? { lists: [] }}
          isProcessing={isProcessing}
          error={error}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          onRetry={handleRetry}
        />
      )}
    </Layout>
  )
}
