import { forwardRef, useEffect, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/db'
import type { TaskList } from '../lib/db'
import { getColorByKey } from '../lib/constants'

export type ListViewMode = 'card' | 'list'

interface ListCardProps {
  list: TaskList
  viewMode?: ListViewMode
  isDragging?: boolean
  style?: CSSProperties
  longPressProps?: {
    onPointerDown: (e: ReactPointerEvent) => void
    onClickCapture: (e: ReactMouseEvent) => void
    style: CSSProperties
  }
}

export const ListCard = forwardRef<HTMLDivElement, ListCardProps>(function ListCard(
  { list, viewMode = 'card', isDragging = false, style, longPressProps },
  ref,
) {
  const [counts, setCounts] = useState({ total: 0, done: 0 })
  const color = getColorByKey(list.color)

  useEffect(() => {
    db.tasks
      .where('listId')
      .equals(list.id)
      .toArray()
      .then((tasks) => {
        setCounts({
          total: tasks.length,
          done: tasks.filter((t) => t.completed).length,
        })
      })
  }, [list.id])

  const progress = counts.total > 0 ? (counts.done / counts.total) * 100 : 0

  const wrapperStyle: CSSProperties = { ...longPressProps?.style, ...style }

  if (viewMode === 'list') {
    return (
      <div
        ref={ref}
        data-drag-id={list.id}
        style={wrapperStyle}
        onPointerDown={longPressProps?.onPointerDown}
        onClickCapture={longPressProps?.onClickCapture}
      >
        <Link
          to={`/list/${list.id}`}
          draggable={false}
          className={`glass rounded-2xl p-4 flex items-center gap-4 transition-shadow duration-200 no-underline ${
            isDragging ? 'shadow-xl' : 'hover:shadow-lg active:scale-[0.99]'
          }`}
        >
          <span className="text-2xl flex-shrink-0">{list.icon}</span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-sm font-semibold text-gray-800 truncate text-left">
                {list.name}
              </h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${color.bg} ${color.text}`}>
                {counts.done}/{counts.total}
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${color.accent} rounded-full transition-all duration-500`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </Link>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      data-drag-id={list.id}
      style={wrapperStyle}
      onPointerDown={longPressProps?.onPointerDown}
      onClickCapture={longPressProps?.onClickCapture}
    >
      <Link
        to={`/list/${list.id}`}
        draggable={false}
        className={`glass rounded-2xl p-5 block transition-shadow duration-200 no-underline ${
          isDragging ? 'shadow-xl' : 'hover:shadow-xl active:scale-[0.98]'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl">{list.icon}</span>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${color.bg} ${color.text}`}>
            {counts.done}/{counts.total}
          </span>
        </div>

        <h3 className="text-base font-semibold text-gray-800 mb-3 text-left">
          {list.name}
        </h3>

        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${color.accent} rounded-full transition-all duration-500`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </Link>
    </div>
  )
})
