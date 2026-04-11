import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import { Layout } from '../components/Layout'
import { TaskItem } from '../components/TaskItem'
import { db } from '../lib/db'
import { useTasks } from '../hooks/useTasks'
import { useLists } from '../hooks/useLists'
import { getColorByKey } from '../lib/constants'

export function ListPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { tasks, toggleTask, deleteTask, updateTask, addTask } = useTasks(id)
  const { deleteList, updateList } = useLists()
  const [newTaskText, setNewTaskText] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameText, setRenameText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const list = useLiveQuery(() => (id ? db.lists.get(id) : undefined), [id])

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

  const uncompletedTasks = tasks.filter((t) => !t.completed)
  const completedTasks = tasks.filter((t) => t.completed)

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

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            {t('list.deleteList')}
          </button>
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
      <div className="px-6 space-y-2">
        {uncompletedTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            accentColor={color.accent}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onUpdate={(taskId, text) => updateTask(taskId, { text })}
          />
        ))}

        {completedTasks.length > 0 && uncompletedTasks.length > 0 && (
          <div className="pt-4 pb-2">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              Completed ({completedTasks.length})
            </span>
          </div>
        )}

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

        {tasks.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-12">{t('list.empty')}</p>
        )}
      </div>

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
