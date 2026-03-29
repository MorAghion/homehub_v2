/**
 * useTasksHub — Sub-Hub CRUD and Supabase Realtime subscriptions for the Tasks Hub.
 *
 * Provides:
 *   - All task lists (sub-hubs) for the current household
 *   - All tasks for a given list_id
 *   - CRUD operations for task lists and tasks
 *   - Realtime subscription per CLAUDE.md §4.9:
 *     subscribe to task_lists (parent table), re-fetch tasks on change
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { sortTasksWithDoneAtBottom, type Task, type TaskList } from '../lib/tasks'
import type { UserProfile } from '../types/user'

export interface TasksHubData {
  taskLists: TaskList[]
  tasksByListId: Record<string, Task[]>
  members: UserProfile[]
  isLoading: boolean
  error: string | null
}

export interface TasksHubMutations {
  createList: (name: string) => Promise<TaskList>
  updateList: (id: string, name: string) => Promise<void>
  deleteList: (id: string) => Promise<void>
  createTask: (listId: string, input: Partial<Task>) => Promise<Task>
  updateTask: (id: string, input: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  deleteTasks: (ids: string[]) => Promise<void>
  clearCompleted: (listId: string) => Promise<number>
}

export function useTasksHub(householdId: string | null): TasksHubData & TasksHubMutations {
  const [taskLists, setTaskLists] = useState<TaskList[]>([])
  const [tasksByListId, setTasksByListId] = useState<Record<string, Task[]>>({})
  const [members, setMembers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasksForAllLists = useCallback(async (lists: TaskList[]) => {
    if (lists.length === 0) {
      setTasksByListId({})
      return
    }
    const listIds = lists.map((l) => l.id)
    const { data, error: fetchErr } = await supabase
      .from('tasks')
      .select('*')
      .in('list_id', listIds)
      .order('created_at', { ascending: true })
    if (fetchErr) {
      setError(fetchErr.message)
      return
    }
    const byListId: Record<string, Task[]> = {}
    for (const list of lists) {
      byListId[list.id] = []
    }
    for (const task of (data as Task[]) ?? []) {
      const existing = byListId[task.list_id] ?? []
      existing.push(task)
      byListId[task.list_id] = existing
    }
    // Apply sort: done tasks at bottom
    for (const listId of Object.keys(byListId)) {
      byListId[listId] = sortTasksWithDoneAtBottom(byListId[listId] ?? [])
    }
    setTasksByListId(byListId)
  }, [])

  const fetchAll = useCallback(async () => {
    if (!householdId) return
    setError(null)

    const [listsResult, membersResult] = await Promise.all([
      supabase
        .from('task_lists')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: true }),
      supabase
        .from('user_profiles')
        .select('id, household_id, display_name, role, created_at')
        .eq('household_id', householdId),
    ])

    if (listsResult.error) {
      setError(listsResult.error.message)
      setIsLoading(false)
      return
    }

    const lists = (listsResult.data as TaskList[]) ?? []
    setTaskLists(lists)
    setMembers((membersResult.data as UserProfile[]) ?? [])

    await fetchTasksForAllLists(lists)
    setIsLoading(false)
  }, [householdId, fetchTasksForAllLists])

  // Initial load
  useEffect(() => {
    if (!householdId) {
      setIsLoading(false)
      return
    }
    void fetchAll()
  }, [householdId, fetchAll])

  // Realtime: subscribe to task_lists parent table per §4.9
  useEffect(() => {
    if (!householdId) return

    const channel = supabase
      .channel(`household:${householdId}:tasks`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_lists',
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          void fetchAll()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [householdId, fetchAll])

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const createList = useCallback(
    async (name: string): Promise<TaskList> => {
      if (!householdId) throw new Error('No household')
      const { data, error: err } = await supabase
        .from('task_lists')
        .insert({ household_id: householdId, name: name.trim() })
        .select()
        .single()
      if (err || !data) throw new Error(err?.message ?? 'Failed to create list')
      const newList = data as TaskList
      setTaskLists((prev) => [...prev, newList])
      setTasksByListId((prev) => ({ ...prev, [newList.id]: [] }))
      return newList
    },
    [householdId],
  )

  const updateList = useCallback(async (id: string, name: string): Promise<void> => {
    const { error: err } = await supabase
      .from('task_lists')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) throw new Error(err.message)
    setTaskLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: name.trim() } : l)))
  }, [])

  const deleteList = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('task_lists').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setTaskLists((prev) => prev.filter((l) => l.id !== id))
    setTasksByListId((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const createTask = useCallback(async (listId: string, input: Partial<Task>): Promise<Task> => {
    const { data, error: err } = await supabase
      .from('tasks')
      .insert({
        list_id: listId,
        title: input.title ?? '',
        description: input.description ?? null,
        status: input.status ?? 'todo',
        urgency: input.urgency ?? 'low',
        is_urgent: input.is_urgent ?? false,
        assignee_id: input.assignee_id ?? null,
        due_date: input.due_date ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single()
    if (err || !data) throw new Error(err?.message ?? 'Failed to create task')
    const newTask = data as Task
    setTasksByListId((prev) => {
      const existing = prev[listId] ?? []
      return { ...prev, [listId]: sortTasksWithDoneAtBottom([...existing, newTask]) }
    })
    return newTask
  }, [])

  const updateTask = useCallback(async (id: string, input: Partial<Task>): Promise<void> => {
    const { error: err } = await supabase
      .from('tasks')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) throw new Error(err.message)
    setTasksByListId((prev) => {
      const next = { ...prev }
      for (const listId of Object.keys(next)) {
        const updatedTasks = (next[listId] ?? []).map((t) => (t.id === id ? { ...t, ...input } : t))
        next[listId] = sortTasksWithDoneAtBottom(updatedTasks)
      }
      return next
    })
  }, [])

  const deleteTask = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('tasks').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setTasksByListId((prev) => {
      const next = { ...prev }
      for (const listId of Object.keys(next)) {
        next[listId] = (next[listId] ?? []).filter((t) => t.id !== id)
      }
      return next
    })
  }, [])

  const deleteTasks = useCallback(async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return
    const { error: err } = await supabase.from('tasks').delete().in('id', ids)
    if (err) throw new Error(err.message)
    const idSet = new Set(ids)
    setTasksByListId((prev) => {
      const next = { ...prev }
      for (const listId of Object.keys(next)) {
        next[listId] = (next[listId] ?? []).filter((t) => !idSet.has(t.id))
      }
      return next
    })
  }, [])

  const clearCompleted = useCallback(
    async (listId: string): Promise<number> => {
      const tasks = tasksByListId[listId] ?? []
      const doneIds = tasks.filter((t) => t.status === 'done').map((t) => t.id)
      if (doneIds.length === 0) return 0
      await deleteTasks(doneIds)
      return doneIds.length
    },
    [tasksByListId, deleteTasks],
  )

  return {
    taskLists,
    tasksByListId,
    members,
    isLoading,
    error,
    createList,
    updateList,
    deleteList,
    createTask,
    updateTask,
    deleteTask,
    deleteTasks,
    clearCompleted,
  }
}
