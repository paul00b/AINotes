import { forwardRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import type { Task } from '../lib/db'

interface TaskItemProps {
  task: Task
  accentColor: string
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, text: string) => void
  isDragging?: boolean
  style?: CSSProperties
  dragHandleProps?: {
    onPointerDown: (e: ReactPointerEvent) => void
    style: CSSProperties
  }
}

export const TaskItem = forwardRef<HTMLDivElement, TaskItemProps>(function TaskItem(
  { task, accentColor, onToggle, onDelete, onUpdate, isDragging = false, style, dragHandleProps },
  ref,
) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(task.text)
  const [swiped, setSwiped] = useState(false)

  function handleSubmitEdit() {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== task.text) {
      onUpdate(task.id, trimmed)
    } else {
      setEditText(task.text)
    }
    setIsEditing(false)
  }

  return (
    <div
      ref={ref}
      data-drag-id={task.id}
      style={style}
      className="group relative"
    >
      <div
        className={`glass rounded-xl px-3 py-3 flex items-center gap-2 transition-all duration-200 ${
          swiped ? '-translate-x-20' : ''
        } ${isDragging ? 'shadow-xl' : ''}`}
      >
        {/* Drag handle */}
        {dragHandleProps && (
          <button
            type="button"
            aria-label="Reorder"
            onPointerDown={dragHandleProps.onPointerDown}
            style={dragHandleProps.style}
            className="flex-shrink-0 text-gray-300 hover:text-gray-500 p-1 -ml-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="9" cy="6" r="1.2" fill="currentColor" />
              <circle cx="15" cy="6" r="1.2" fill="currentColor" />
              <circle cx="9" cy="12" r="1.2" fill="currentColor" />
              <circle cx="15" cy="12" r="1.2" fill="currentColor" />
              <circle cx="9" cy="18" r="1.2" fill="currentColor" />
              <circle cx="15" cy="18" r="1.2" fill="currentColor" />
            </svg>
          </button>
        )}

        {/* Custom checkbox */}
        <button
          onClick={() => onToggle(task.id)}
          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
            task.completed
              ? `${accentColor} border-transparent`
              : 'border-gray-300 hover:border-emerald-400'
          }`}
        >
          {task.completed && (
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Task text */}
        {isEditing ? (
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSubmitEdit}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitEdit()}
            className="flex-1 bg-transparent outline-none text-gray-800 text-sm"
            autoFocus
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            className={`flex-1 text-sm cursor-text transition-all duration-200 ${
              task.completed ? 'line-through text-gray-400' : 'text-gray-700'
            }`}
          >
            {task.text}
          </span>
        )}

        {/* Swipe toggle */}
        <button
          onClick={() => setSwiped(!swiped)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-gray-500 p-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Delete action (revealed on swipe) */}
      {swiped && (
        <button
          onClick={() => onDelete(task.id)}
          className="absolute right-0 top-0 bottom-0 w-16 bg-red-500 rounded-xl flex items-center justify-center text-white transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  )
})
