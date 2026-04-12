import { supabase } from './supabase'
import { db, type TaskList, type Task } from './db'

export async function pushLocalDataToSupabase(userId: string) {
  const lists = await db.lists.toArray()
  const tasks = await db.tasks.toArray()

  if (lists.length === 0) return

  // Upsert lists
  const { error: listsError } = await supabase.from('lists').upsert(
    lists.map((l) => ({
      id: l.id,
      user_id: userId,
      name: l.name,
      icon: l.icon,
      color: l.color,
      order: l.order,
      created_at: l.createdAt,
    })),
  )
  if (listsError) throw listsError

  // Upsert tasks
  if (tasks.length > 0) {
    const { error: tasksError } = await supabase.from('tasks').upsert(
      tasks.map((t) => ({
        id: t.id,
        user_id: userId,
        list_id: t.listId,
        text: t.text,
        completed: t.completed,
        order: t.order,
        created_at: t.createdAt,
      })),
    )
    if (tasksError) throw tasksError
  }
}

export async function pullFromSupabase(userId: string) {
  const { data: remoteLists, error: listsError } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', userId)

  if (listsError) throw listsError

  const { data: remoteTasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)

  if (tasksError) throw tasksError

  // Clear local and replace with remote data
  await db.transaction('rw', db.lists, db.tasks, async () => {
    await db.lists.clear()
    await db.tasks.clear()

    if (remoteLists && remoteLists.length > 0) {
      await db.lists.bulkPut(
        remoteLists.map((l) => ({
          id: l.id,
          name: l.name,
          icon: l.icon,
          color: l.color,
          order: l.order,
          createdAt: l.created_at,
        })),
      )
    }

    if (remoteTasks && remoteTasks.length > 0) {
      await db.tasks.bulkPut(
        remoteTasks.map((t) => ({
          id: t.id,
          listId: t.list_id,
          text: t.text,
          completed: t.completed,
          order: t.order,
          createdAt: t.created_at,
        })),
      )
    }
  })
}

// --- CRUD sync helpers ---

export async function syncAddList(userId: string, list: TaskList) {
  const { error } = await supabase.from('lists').insert({
    id: list.id,
    user_id: userId,
    name: list.name,
    icon: list.icon,
    color: list.color,
    order: list.order,
    created_at: list.createdAt,
  })
  if (error) console.error('Sync addList error:', error)
}

export async function syncUpdateList(userId: string, id: string, updates: Partial<TaskList>) {
  const mapped: Record<string, unknown> = {}
  if (updates.name !== undefined) mapped.name = updates.name
  if (updates.icon !== undefined) mapped.icon = updates.icon
  if (updates.color !== undefined) mapped.color = updates.color
  if (updates.order !== undefined) mapped.order = updates.order

  if (Object.keys(mapped).length === 0) return

  const { error } = await supabase
    .from('lists')
    .update(mapped)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) console.error('Sync updateList error:', error)
}

export async function syncDeleteList(userId: string, id: string) {
  const { error } = await supabase
    .from('lists')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) console.error('Sync deleteList error:', error)
}

export async function syncAddTask(userId: string, task: Task) {
  const { error } = await supabase.from('tasks').insert({
    id: task.id,
    user_id: userId,
    list_id: task.listId,
    text: task.text,
    completed: task.completed,
    order: task.order,
    created_at: task.createdAt,
  })
  if (error) console.error('Sync addTask error:', error)
}

export async function syncUpdateTask(userId: string, id: string, updates: Partial<Task>) {
  const mapped: Record<string, unknown> = {}
  if (updates.text !== undefined) mapped.text = updates.text
  if (updates.completed !== undefined) mapped.completed = updates.completed
  if (updates.order !== undefined) mapped.order = updates.order
  if (updates.listId !== undefined) mapped.list_id = updates.listId

  if (Object.keys(mapped).length === 0) return

  const { error } = await supabase
    .from('tasks')
    .update(mapped)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) console.error('Sync updateTask error:', error)
}

export async function syncDeleteTask(userId: string, id: string) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) console.error('Sync deleteTask error:', error)
}
