import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { ListCard, type ListViewMode } from '../components/ListCard'
import { EmptyState } from '../components/EmptyState'
import { VoiceButton } from '../components/VoiceButton'
import { TranscriptionLoader } from '../components/TranscriptionLoader'
import { AIResultView } from '../components/AIResultView'
import { useLists } from '../hooks/useLists'
import { useCategories } from '../hooks/useCategories'
import { CategoryBar } from '../components/CategoryBar'
import { useTasks } from '../hooks/useTasks'
import { useAI } from '../hooks/useAI'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { useDragSort } from '../hooks/useDragSort'
import { transcribeWithGemini } from '../lib/ai'
import { getColorForIndex } from '../lib/constants'
import { db } from '../lib/db'
import type { AIResponse } from '../lib/ai'
import type { TaskList } from '../lib/db'

type LoaderPhase = 'transcribing' | 'organizing'

const VIEW_MODE_KEY = 'ainotes_view_mode'

function loadViewMode(): ListViewMode {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(VIEW_MODE_KEY) : null
  return stored === 'list' ? 'list' : 'card'
}

export function HomePage() {
  const { t, i18n } = useTranslation()
  const {
    categories,
    activeCategoryId,
    setActiveCategoryId,
    addCategory,
    renameCategory,
    deleteCategory,
  } = useCategories()
  const { lists, addList, findListByName, reorderLists } = useLists(activeCategoryId)
  const { addTask } = useTasks()
  const { isProcessing, result, error, process, reset } = useAI()
  const recorder = useAudioRecorder()

  const [loaderPhase, setLoaderPhase] = useState<LoaderPhase | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [pendingText, setPendingText] = useState('')
  const [viewMode, setViewMode] = useState<ListViewMode>(loadViewMode)

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode)
  }, [viewMode])

  const handleReorder = useCallback((newList: TaskList[]) => {
    reorderLists(newList.map((l) => l.id))
  }, [reorderLists])

  const { containerRef, getItemStyle, bindLongPress, draggingId } = useDragSort<TaskList>(
    lists,
    handleReorder,
    viewMode === 'card' ? 'grid' : 'vertical',
  )

  const getExistingTasks = useCallback(async () => {
    const existingTasks: Record<string, string[]> = {}
    for (const list of lists) {
      const tasks = await db.tasks.where('listId').equals(list.id).toArray()
      existingTasks[list.id] = tasks.map((t) => t.text)
    }
    return existingTasks
  }, [lists])

  const handleTap = useCallback(async () => {
    if (recorder.isRecording) {
      const blob = await recorder.stop()
      if (!blob) return

      try {
        setLoaderPhase('transcribing')
        const transcript = await transcribeWithGemini(blob, i18n.language)

        if (!transcript) {
          setLoaderPhase(null)
          return
        }

        setPendingText(transcript)
        setLoaderPhase('organizing')
        setShowResult(true)
        const existingTasks = await getExistingTasks()
        await process(transcript, lists, i18n.language, existingTasks)
        setLoaderPhase(null)
      } catch (err) {
        console.error('Processing error:', err)
        setLoaderPhase(null)
        setShowResult(true)
      }
    } else {
      try {
        await recorder.start()
      } catch (err) {
        console.error('Microphone access denied:', err)
      }
    }
  }, [recorder, i18n.language, lists, process, getExistingTasks])

  const handleConfirm = useCallback(async (aiResult: AIResponse) => {
    for (const aiList of aiResult.lists) {
      let listId: string

      const existing = await findListByName(aiList.name)
      if (existing) {
        listId = existing.id
      } else {
        const colorIndex = lists.length + aiResult.lists.indexOf(aiList)
        listId = await addList(aiList.name, aiList.icon, getColorForIndex(colorIndex).key)
      }

      for (const taskText of aiList.tasks) {
        await addTask(taskText, listId)
      }
    }

    setShowResult(false)
    reset()
  }, [lists, addList, addTask, findListByName, reset])

  const handleCancel = useCallback(() => {
    setShowResult(false)
    setLoaderPhase(null)
    reset()
  }, [reset])

  const handleRetry = useCallback(async () => {
    if (pendingText) {
      setLoaderPhase('organizing')
      const existingTasks = await getExistingTasks()
      await process(pendingText, lists, i18n.language, existingTasks)
      setLoaderPhase(null)
    }
  }, [pendingText, lists, i18n.language, process, getExistingTasks])

  return (
    <Layout>
      {/* Header */}
      <div className="px-6 pt-14 pb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">{t('home.myLists')}</h1>
        <div className="flex items-center gap-2">
          {lists.length > 0 && (
            <button
              onClick={() => setViewMode((m) => (m === 'card' ? 'list' : 'card'))}
              aria-label={t('home.toggleView')}
              className="w-10 h-10 rounded-xl bg-white/60 backdrop-blur flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              {viewMode === 'card' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <rect x="4" y="4" width="7" height="7" rx="1.5" />
                  <rect x="13" y="4" width="7" height="7" rx="1.5" />
                  <rect x="4" y="13" width="7" height="7" rx="1.5" />
                  <rect x="13" y="13" width="7" height="7" rx="1.5" />
                </svg>
              )}
            </button>
          )}
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
      </div>

      {/* Category switcher */}
      <CategoryBar
        categories={categories}
        activeId={activeCategoryId}
        onSelect={setActiveCategoryId}
        onAdd={(name) => addCategory(name)}
        onRename={renameCategory}
        onDelete={deleteCategory}
      />

      {/* Lists */}
      {lists.length > 0 ? (
        <div
          ref={containerRef}
          className={`px-6 ${viewMode === 'card' ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-3'}`}
        >
          {lists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              viewMode={viewMode}
              isDragging={draggingId === list.id}
              style={getItemStyle(list.id)}
              longPressProps={bindLongPress(list.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}

      {/* Voice FAB */}
      {!loaderPhase && !showResult && (
        <VoiceButton
          onTap={handleTap}
          isRecording={recorder.isRecording}
        />
      )}

      {/* Transcription / Organization loader */}
      {loaderPhase && (
        <TranscriptionLoader phase={loaderPhase} />
      )}

      {/* AI Result — shown once loader is done */}
      {showResult && !loaderPhase && (
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
