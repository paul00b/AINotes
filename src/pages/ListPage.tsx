import { useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import { Layout } from '../components/Layout'
import { TaskItem } from '../components/TaskItem'
import { db, type Task } from '../lib/db'
import { useTasks } from '../hooks/useTasks'
import { useLists } from '../hooks/useLists'
import { useCategories } from '../hooks/useCategories'
import { useDragSort } from '../hooks/useDragSort'
import { getColorByKey } from '../lib/constants'

export function ListPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { tasks, toggleTask, deleteTask, updateTask, addTask, reorderTasks } = useTasks(id)
  const { deleteList, updateList } = useLists()
  const { categories, setActiveCategoryId } = useCategories()
  const [newTaskText, setNewTaskText] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameText, setRenameText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMove, setShowMove] = useState(false)

  const list = useLiveQuery(() => (id ? db.lists.get(id) : undefined), [id])

  const uncompletedTasks = tasks.filter((t) => !t.completed)
  const completedTasks = tasks.filter((t) => t.completed)

  const handleReorderUncompleted = useCallback((newOrder: Task[]) => {
    const combined = [...newOrder.map((t) => t.id), ...completedTasks.map((t) => t.id)]
    reorderTasks(combined)
  }, [reorderTasks, completedTasks])

  const { containerRef, getItemStyle, bindHandle, draggingId } = useDragSort<Task>(
    uncompletedTasks,
    handleReorderUncompleted,
    'vertical',
  )

  if (!list) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-gray-400">
          Loading...
        </div>
      </Layout>
    )
  }

  const color = getColorByKey(list.color)
  const completedCount = tasks.filter((t) => t.completed).length

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (newTaskText.trim() && id) {
      addTask(newTaskText.trim(), id)
      setNewTaskText('')
    }
  }

  function handleRename() {
    if (renameText.trim() && renameText.trim() !== list!.name) {
      updateList(list!.id, { name: renameText.trim() })
    }
    setIsRenaming(false)
  }

  async function handleDeleteList() {
    await deleteList(list!.id)
    navigate('/')
  }

  async function handleMoveTo(categoryId: string) {
    if (!list || categoryId === list.categoryId) {
      setShowMove(false)
      return
    }
    await updateList(list.id, { categoryId })
    setShowMove(false)
    setActiveCategoryId(categoryId)
    navigate('/')
  }

  return (
    <Layout>
      {/* Header */}
      <div className="px-6 pt-14 pb-2">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors mb-4"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">{t('common.back')}</span>
        </button>

        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{list.icon}</span>
          {isRenaming ? (
            <input
              type="text"
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              className="text-2xl font-bold text-gray-800 bg-transparent outline-none border-b-2 border-emerald-300"
              autoFocus
            />
          ) : (
            <h1
              onClick={() => {
                setRenameText(list.name)
                setIsRenaming(true)
              }}
              className="text-2xl font-bold text-gray-800 cursor-text"
            >
              {list.name}
            </h1>
          )}
        </div>

        <div className="flex items-center justify-between mb-6">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${color.bg} ${color.text}`}>
            {completedCount}/{tasks.length} {t('home.tasks', { count: tasks.length }).split(' ').slice(1).join(' ')}
          </span>

          <div className="flex items-center gap-4">
            {categories.length > 1 && (
              <button
                onClick={() => setShowMove(true)}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                {t('list.moveTo')}
              </button>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              {t('list.deleteList')}
            </button>
          </div>
        </div>
      </div>

      {/* Add task input */}
      <div className="px-6 mb-4">
        <form onSubmit={handleAddTask}>
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder={t('list.addTask')}
            className="w-full glass rounded-xl px-4 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />
        </form>
      </div>

      {/* Tasks */}
      <div className="px-6">
        <div ref={containerRef} className="flex flex-col gap-2">
          {uncompletedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              accentColor={color.accent}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onUpdate={(taskId, text) => updateTask(taskId, { text })}
              isDragging={draggingId === task.id}
              style={getItemStyle(task.id)}
              dragHandleProps={bindHandle(task.id)}
            />
          ))}
        </div>

        {completedTasks.length > 0 && uncompletedTasks.length > 0 && (
          <div className="pt-4 pb-2">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              {t('list.completed')} ({completedTasks.length})
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {completedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              accentColor={color.accent}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onUpdate={(taskId, text) => updateTask(taskId, { text })}
            />
          ))}
        </div>

        {tasks.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-12">{t('list.empty')}</p>
        )}
      </div>

      {/* Move to category */}
      {showMove && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowMove(false)}
        >
          <div
            className="glass rounded-2xl p-4 max-w-sm w-full space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs uppercase tracking-wide text-gray-400 font-medium px-2 pb-2">
              {t('list.moveTo')}
            </p>
            {categories.map((cat) => {
              const isCurrent = cat.id === list.categoryId
              return (
                <button
                  key={cat.id}
                  onClick={() => handleMoveTo(cat.id)}
                  disabled={isCurrent}
                  className={`w-full px-3 py-3 rounded-xl text-left text-sm transition-colors flex items-center justify-between ${
                    isCurrent
                      ? 'text-gray-400 bg-gray-100/50'
                      : 'text-gray-700 hover:bg-white/60'
                  }`}
                >
                  <span>{cat.name}</span>
                  {isCurrent && (
                    <span className="text-xs text-gray-400">✓</span>
                  )}
                </button>
              )
            })}
            <button
              onClick={() => setShowMove(false)}
              className="w-full mt-2 py-3 rounded-xl text-sm font-medium text-gray-500 bg-gray-100"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 max-w-sm w-full space-y-4">
            <p className="text-sm text-gray-700 text-center">
              {t('list.deleteListConfirm', { name: list.name })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-500 bg-gray-100"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteList}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-white bg-red-500"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
