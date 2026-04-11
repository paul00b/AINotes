import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/db'
import type { TaskList } from '../lib/db'
import { getColorByKey } from '../lib/constants'

interface ListCardProps {
  list: TaskList
}

export function ListCard({ list }: ListCardProps) {
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

  return (
    <Link
      to={`/list/${list.id}`}
      className="glass rounded-2xl p-5 block transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] no-underline"
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
  )
}
