import { supabase } from './supabase'
import { db, type TaskList, type Task, type Category } from './db'

export async function pushLocalDataToSupabase(userId: string) {
  const categories = await db.categories.toArray()
  const lists = await db.lists.toArray()
  const tasks = await db.tasks.toArray()

  if (categories.length > 0) {
    const { error } = await supabase.from('categories').upsert(
      categories.map((c) => ({
        id: c.id,
        user_id: userId,
        name: c.name,
        order: c.order,
        created_at: c.createdAt,
      })),
    )
    if (error) console.warn('Categories sync skipped (table missing?):', error.message)
  }

  if (lists.length === 0) return

  // Upsert lists (try with category_id, fall back without if column missing)
  const listsPayload = lists.map((l) => ({
    id: l.id,
    user_id: userId,
    category_id: l.categoryId,
    name: l.name,
    icon: l.icon,
    color: l.color,
    order: l.order,
    created_at: l.createdAt,
  }))
  let listsError = (await supabase.from('lists').upsert(listsPayload)).error
  if (listsError) {
    const fallback = listsPayload.map((p) => {
      const { category_id, ...rest } = p
      return rest
    })
    listsError = (await supabase.from('lists').upsert(fallback)).error
  }
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
  const catResp = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
  const remoteCategories = catResp.data
  if (catResp.error) console.warn('Categories pull skipped:', catResp.error.message)

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

  // Preserve local categories if remote has none (Supabase table may not exist yet)
  const localCategories = await db.categories.toArray()
  const effectiveCategories =
    remoteCategories && remoteCategories.length > 0
      ? remoteCategories.map((c) => ({
          id: c.id,
          name: c.name,
          order: c.order,
          createdAt: c.created_at,
        }))
      : localCategories

  // Ensure we always have at least one category to anchor orphan lists to
  const fallbackCategoryId = effectiveCategories[0]?.id

  await db.transaction('rw', db.categories, db.lists, db.tasks, async () => {
    await db.categories.clear()
    await db.lists.clear()
    await db.tasks.clear()

    if (effectiveCategories.length > 0) {
      await db.categories.bulkPut(effectiveCategories)
    }

    if (remoteLists && remoteLists.length > 0) {
      await db.lists.bulkPut(
        remoteLists.map((l) => ({
          id: l.id,
          categoryId: l.category_id ?? fallbackCategoryId,
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

// --- Category sync ---

export async function syncAddCategory(userId: string, cat: Category) {
  const { error } = await supabase.from('categories').insert({
    id: cat.id,
    user_id: userId,
    name: cat.name,
    order: cat.order,
    created_at: cat.createdAt,
  })
  if (error) console.error('Sync addCategory error:', error)
}

export async function syncUpdateCategory(userId: string, id: string, updates: Partial<Category>) {
  const mapped: Record<string, unknown> = {}
  if (updates.name !== undefined) mapped.name = updates.name
  if (updates.order !== undefined) mapped.order = updates.order
  if (Object.keys(mapped).length === 0) return

  const { error } = await supabase
    .from('categories')
    .update(mapped)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) console.error('Sync updateCategory error:', error)
}

export async function syncDeleteCategory(userId: string, id: string) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) console.error('Sync deleteCategory error:', error)
}

// --- List sync ---

export async function syncAddList(userId: string, list: TaskList) {
  const { error } = await supabase.from('lists').insert({
    id: list.id,
    user_id: userId,
    category_id: list.categoryId,
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
  if (updates.categoryId !== undefined) mapped.category_id = updates.categoryId

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
