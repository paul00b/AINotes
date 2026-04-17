import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Task } from '../lib/db'
import { nanoid } from 'nanoid'
import { useAuthContext } from '../contexts/AuthContext'
import { syncAddTask, syncUpdateTask, syncDeleteTask } from '../lib/sync'

export function useTasks(listId?: string) {
  const { user } = useAuthContext()
  const tasks = useLiveQuery(
    () => {
      if (!listId) return db.tasks.orderBy('order').toArray()
      return db.tasks.where('listId').equals(listId).sortBy('order')
    },
    [listId],
  ) ?? []

  async function addTask(text: string, targetListId: string): Promise<string> {
    const id = nanoid()
    const existing = await db.tasks.where('listId').equals(targetListId).toArray()
    const maxOrder = existing.length > 0 ? Math.max(...existing.map((t) => t.order)) : 0

    const task: Task = {
      id,
      listId: targetListId,
      text,
      completed: false,
      order: maxOrder + 1,
      createdAt: Date.now(),
    }

    await db.tasks.add(task)
    if (user) syncAddTask(user.id, task)

    return id
  }

  async function toggleTask(id: string) {
    const task = await db.tasks.get(id)
    if (task) {
      const updates = { completed: !task.completed }
      await db.tasks.update(id, updates)
      if (user) syncUpdateTask(user.id, id, updates)
    }
  }

  async function updateTask(id: string, updates: Partial<Pick<Task, 'text' | 'completed' | 'order' | 'listId'>>) {
    await db.tasks.update(id, updates)
    if (user) syncUpdateTask(user.id, id, updates)
  }

  async function deleteTask(id: string) {
    await db.tasks.delete(id)
    if (user) syncDeleteTask(user.id, id)
  }

  async function getTaskCountForList(targetListId: string) {
    const all = await db.tasks.where('listId').equals(targetListId).toArray()
    const done = all.filter((t) => t.completed).length
    return { total: all.length, done }
  }

  async function reorderTasks(orderedIds: string[]) {
    const updates = orderedIds.map((id, index) => ({ id, order: index + 1 }))
    await db.transaction('rw', db.tasks, async () => {
      for (const { id, order } of updates) {
        await db.tasks.update(id, { order })
      }
    })
    if (user) {
      for (const { id, order } of updates) {
        syncUpdateTask(user.id, id, { order })
      }
    }
  }

  return { tasks, addTask, toggleTask, updateTask, deleteTask, getTaskCountForList, reorderTasks }
}
