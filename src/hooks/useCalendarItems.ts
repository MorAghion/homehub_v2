import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Bill } from '../types/bills'
import type { Task } from '../lib/tasks'

export interface CalendarDay {
  date: string   // YYYY-MM-DD
  bills: Bill[]
  tasks: Task[]
}

export function useCalendarItems(householdId: string | null): CalendarDay[] {
  const [days, setDays] = useState<CalendarDay[]>([])

  useEffect(() => {
    if (!householdId) return
    const today = new Date()
    const from = today.toISOString().slice(0, 10)
    const to = new Date(today.getTime() + 30 * 86400_000).toISOString().slice(0, 10)

    void Promise.all([
      supabase
        .from('bills')
        .select('*')
        .eq('household_id', householdId)
        .eq('status', 'pending')
        .gte('date', from)
        .lte('date', to)
        .order('date'),
      supabase
        .from('tasks')
        .select('*')
        .eq('household_id', householdId)
        .eq('status', 'open')
        .gte('due_date', from)
        .lte('due_date', to)
        .order('due_date'),
    ]).then(([billsRes, tasksRes]) => {
      const bills = (billsRes.data ?? []) as Bill[]
      const tasks = (tasksRes.data ?? []) as Task[]

      const map = new Map<string, CalendarDay>()
      for (const b of bills) {
        if (!map.has(b.date)) map.set(b.date, { date: b.date, bills: [], tasks: [] })
        map.get(b.date)!.bills.push(b)
      }
      for (const t of tasks) {
        const d = t.due_date
        if (!d) continue
        if (!map.has(d)) map.set(d, { date: d, bills: [], tasks: [] })
        map.get(d)!.tasks.push(t)
      }

      setDays(Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date)))
    })
  }, [householdId])

  return days
}
