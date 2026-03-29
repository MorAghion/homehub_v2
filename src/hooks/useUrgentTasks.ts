/**
 * useUrgentTasks — queries all urgent tasks across all sub-hubs for the current household.
 *
 * PRD §8.4: flat list of is_urgent=true tasks plus overdue bills.
 * Also loads overdue bills from the bills table.
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { buildUrgentItemsList, isBillOverdue, type OverdueBill, type Task, type TaskList, type UrgentItem } from '../lib/tasks'

export interface UrgentTasksData {
  urgentItems: UrgentItem[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refresh: () => void
}

export function useUrgentTasks(householdId: string | null): UrgentTasksData {
  const [urgentItems, setUrgentItems] = useState<UrgentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUrgent = useCallback(async () => {
    if (!householdId) {
      setIsLoading(false)
      return
    }
    setError(null)

    // Fetch all task lists + their urgent tasks
    const { data: lists, error: listsErr } = await supabase
      .from('task_lists')
      .select('*')
      .eq('household_id', householdId)

    if (listsErr) {
      setError(listsErr.message)
      setIsLoading(false)
      return
    }

    const typedLists = (lists as TaskList[]) ?? []

    let urgentTasks: Task[] = []
    if (typedLists.length > 0) {
      const listIds = typedLists.map((l) => l.id)
      const { data: tasks, error: tasksErr } = await supabase
        .from('tasks')
        .select('*')
        .in('list_id', listIds)
        .eq('is_urgent', true)
        .neq('status', 'done')
      if (tasksErr) {
        setError(tasksErr.message)
        setIsLoading(false)
        return
      }
      urgentTasks = (tasks as Task[]) ?? []
    }

    // Fetch overdue bills
    const { data: bills, error: billsErr } = await supabase
      .from('bills')
      .select('id, vendor_name, amount, due_date, status')
      .eq('household_id', householdId)
      .eq('status', 'pending')

    if (billsErr) {
      // Bills table may not exist yet — continue without bills
      setError(null)
    }

    const now = new Date()
    const overdueBills: OverdueBill[] = ((bills as OverdueBill[]) ?? []).filter((b) =>
      isBillOverdue(b, now),
    )

    // Build the task list map for buildUrgentItemsList
    const listMap = new Map<string, { list: TaskList; tasks: readonly Task[] }>()
    for (const list of typedLists) {
      listMap.set(list.id, { list, tasks: urgentTasks.filter((t) => t.list_id === list.id) })
    }

    const items = buildUrgentItemsList(listMap, overdueBills)
    setUrgentItems(items)
    setIsLoading(false)
  }, [householdId])

  useEffect(() => {
    void fetchUrgent()
  }, [fetchUrgent])

  return {
    urgentItems,
    totalCount: urgentItems.length,
    isLoading,
    error,
    refresh: fetchUrgent,
  }
}
