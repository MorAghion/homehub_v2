import { describe, it, expect } from 'vitest'
import {
  TASK_STATUSES,
  TASK_URGENCIES,
  validateTask,
  toggleTaskCompletion,
  isValidStatusTransition,
  sortTasksWithDoneAtBottom,
  sortTasksByUrgency,
  filterUrgentTasks,
  buildUrgentItemsList,
  computeNavBadgeCount,
  isTaskOverdue,
  isTaskDueToday,
  isBillOverdue,
  getDoneTaskIds,
  createTaskDefaults,
  isMoreUrgent,
  highestUrgency,
  buildFlashlightRoute,
  type Task,
  type TaskList,
  type TaskStatus,
  type TaskUrgency,
  type OverdueBill,
} from '../tasks'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    list_id: 'list-1',
    title: 'Test task',
    description: null,
    status: 'todo',
    urgency: 'low',
    is_urgent: false,
    assignee_id: null,
    due_date: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeList(overrides: Partial<TaskList> = {}): TaskList {
  return {
    id: 'list-1',
    household_id: 'hh-1',
    name: 'Test List',
    context: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeBill(overrides: Partial<OverdueBill> = {}): OverdueBill {
  return {
    id: 'bill-1',
    vendor_name: 'Electric Co',
    amount: '₪120',
    due_date: '2026-01-01',
    status: 'pending',
    ...overrides,
  }
}

// A fixed "today" for date-dependent tests (2026-03-29)
const TODAY = new Date('2026-03-29T12:00:00Z')
const YESTERDAY = '2026-03-28'
const TOMORROW = '2026-03-30'
const TODAY_STR = '2026-03-29'

// ─── Constants ────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('TASK_STATUSES has exactly 3 values', () => {
    expect(TASK_STATUSES).toHaveLength(3)
    expect(TASK_STATUSES).toContain('todo')
    expect(TASK_STATUSES).toContain('in_progress')
    expect(TASK_STATUSES).toContain('done')
  })

  it('TASK_URGENCIES has exactly 4 values', () => {
    expect(TASK_URGENCIES).toHaveLength(4)
    expect(TASK_URGENCIES).toContain('low')
    expect(TASK_URGENCIES).toContain('medium')
    expect(TASK_URGENCIES).toContain('high')
    expect(TASK_URGENCIES).toContain('critical')
  })
})

// ─── validateTask ──────────────────────────────────────────────────────────────

describe('validateTask', () => {
  it('returns valid for a well-formed task', () => {
    const result = validateTask({ title: 'Fix the sink', status: 'todo', urgency: 'medium' })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('returns title_required for empty title', () => {
    const result = validateTask({ title: '' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('title_required')
  })

  it('returns title_required for whitespace-only title', () => {
    const result = validateTask({ title: '   ' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('title_required')
  })

  it('returns title_too_long for title > 200 chars', () => {
    const result = validateTask({ title: 'a'.repeat(201) })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('title_too_long')
  })

  it('accepts title at exactly 200 chars', () => {
    const result = validateTask({ title: 'a'.repeat(200) })
    expect(result.errors).not.toContain('title_too_long')
  })

  it('returns invalid_status for unknown status', () => {
    const result = validateTask({ title: 'Fix it', status: 'pending' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('invalid_status')
  })

  it('accepts all valid statuses', () => {
    for (const status of TASK_STATUSES) {
      const result = validateTask({ title: 'Task', status })
      expect(result.errors).not.toContain('invalid_status')
    }
  })

  it('returns invalid_urgency for unknown urgency', () => {
    const result = validateTask({ title: 'Fix it', urgency: 'extreme' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('invalid_urgency')
  })

  it('accepts all valid urgency levels', () => {
    for (const urgency of TASK_URGENCIES) {
      const result = validateTask({ title: 'Task', urgency })
      expect(result.errors).not.toContain('invalid_urgency')
    }
  })

  it('returns invalid_due_date for a bad date string', () => {
    const result = validateTask({ title: 'Fix it', due_date: 'not-a-date' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('invalid_due_date')
  })

  it('accepts a valid ISO date', () => {
    const result = validateTask({ title: 'Fix it', due_date: '2026-04-01' })
    expect(result.errors).not.toContain('invalid_due_date')
  })

  it('accepts null due_date', () => {
    const result = validateTask({ title: 'Fix it', due_date: null })
    expect(result.errors).not.toContain('invalid_due_date')
  })

  it('collects multiple errors at once', () => {
    const result = validateTask({ title: '', urgency: 'extreme' })
    expect(result.errors).toContain('title_required')
    expect(result.errors).toContain('invalid_urgency')
    expect(result.errors.length).toBe(2)
  })
})

// ─── toggleTaskCompletion ─────────────────────────────────────────────────────

describe('toggleTaskCompletion', () => {
  it('todo → done', () => {
    expect(toggleTaskCompletion('todo')).toBe('done')
  })

  it('in_progress → done', () => {
    expect(toggleTaskCompletion('in_progress')).toBe('done')
  })

  it('done → todo (reopen)', () => {
    expect(toggleTaskCompletion('done')).toBe('todo')
  })
})

// ─── isValidStatusTransition ──────────────────────────────────────────────────

describe('isValidStatusTransition', () => {
  it('todo → in_progress is valid', () => {
    expect(isValidStatusTransition('todo', 'in_progress')).toBe(true)
  })

  it('todo → done is valid', () => {
    expect(isValidStatusTransition('todo', 'done')).toBe(true)
  })

  it('in_progress → done is valid', () => {
    expect(isValidStatusTransition('in_progress', 'done')).toBe(true)
  })

  it('in_progress → todo is valid (step back)', () => {
    expect(isValidStatusTransition('in_progress', 'todo')).toBe(true)
  })

  it('done → todo is valid (reopen)', () => {
    expect(isValidStatusTransition('done', 'todo')).toBe(true)
  })

  it('done → in_progress is NOT valid', () => {
    expect(isValidStatusTransition('done', 'in_progress')).toBe(false)
  })

  it('same status is NOT valid', () => {
    for (const s of TASK_STATUSES) {
      expect(isValidStatusTransition(s, s)).toBe(false)
    }
  })
})

// ─── sortTasksWithDoneAtBottom ────────────────────────────────────────────────

describe('sortTasksWithDoneAtBottom', () => {
  it('done tasks move to the end', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', status: 'done' }),
      makeTask({ id: '2', status: 'todo' }),
      makeTask({ id: '3', status: 'in_progress' }),
      makeTask({ id: '4', status: 'done' }),
    ]
    const sorted = sortTasksWithDoneAtBottom(tasks)
    expect(sorted[0]!.id).toBe('2')
    expect(sorted[1]!.id).toBe('3')
    expect(sorted[2]!.id).toBe('1')
    expect(sorted[3]!.id).toBe('4')
  })

  it('does not mutate the input array', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', status: 'done' }),
      makeTask({ id: '2', status: 'todo' }),
    ]
    const original = [...tasks]
    sortTasksWithDoneAtBottom(tasks)
    expect(tasks[0]!.id).toBe(original[0]!.id)
  })

  it('returns empty array for empty input', () => {
    expect(sortTasksWithDoneAtBottom([])).toEqual([])
  })

  it('preserves order among active tasks', () => {
    const tasks: Task[] = [
      makeTask({ id: 'a', status: 'todo' }),
      makeTask({ id: 'b', status: 'in_progress' }),
      makeTask({ id: 'c', status: 'todo' }),
    ]
    const sorted = sortTasksWithDoneAtBottom(tasks)
    expect(sorted.map((t) => t.id)).toEqual(['a', 'b', 'c'])
  })

  it('handles all-done list', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', status: 'done' }),
      makeTask({ id: '2', status: 'done' }),
    ]
    const sorted = sortTasksWithDoneAtBottom(tasks)
    expect(sorted.map((t) => t.id)).toEqual(['1', '2'])
  })
})

// ─── sortTasksByUrgency ────────────────────────────────────────────────────────

describe('sortTasksByUrgency', () => {
  it('sorts critical before high before medium before low', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', urgency: 'low' }),
      makeTask({ id: '2', urgency: 'critical' }),
      makeTask({ id: '3', urgency: 'medium' }),
      makeTask({ id: '4', urgency: 'high' }),
    ]
    const sorted = sortTasksByUrgency(tasks)
    expect(sorted.map((t) => t.urgency)).toEqual(['critical', 'high', 'medium', 'low'])
  })

  it('does not mutate input', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', urgency: 'low' }),
      makeTask({ id: '2', urgency: 'critical' }),
    ]
    sortTasksByUrgency(tasks)
    expect(tasks[0]!.id).toBe('1')
  })

  it('returns empty array for empty input', () => {
    expect(sortTasksByUrgency([])).toEqual([])
  })

  it('preserves relative order for equal urgency', () => {
    const tasks: Task[] = [
      makeTask({ id: 'x', urgency: 'high' }),
      makeTask({ id: 'y', urgency: 'high' }),
    ]
    const sorted = sortTasksByUrgency(tasks)
    expect(sorted[0]!.id).toBe('x')
    expect(sorted[1]!.id).toBe('y')
  })
})

// ─── filterUrgentTasks ────────────────────────────────────────────────────────

describe('filterUrgentTasks', () => {
  it('returns only is_urgent=true tasks', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', is_urgent: true }),
      makeTask({ id: '2', is_urgent: false }),
      makeTask({ id: '3', is_urgent: true }),
    ]
    const urgent = filterUrgentTasks(tasks)
    expect(urgent).toHaveLength(2)
    expect(urgent.map((t) => t.id)).toEqual(['1', '3'])
  })

  it('returns empty array when no urgent tasks', () => {
    const tasks: Task[] = [
      makeTask({ is_urgent: false }),
      makeTask({ is_urgent: false }),
    ]
    expect(filterUrgentTasks(tasks)).toHaveLength(0)
  })

  it('returns empty array for empty input', () => {
    expect(filterUrgentTasks([])).toEqual([])
  })
})

// ─── buildUrgentItemsList ─────────────────────────────────────────────────────

describe('buildUrgentItemsList', () => {
  it('combines urgent tasks and overdue bills', () => {
    const list = makeList({ id: 'list-1', name: 'Repairs' })
    const task = makeTask({ id: 't1', list_id: 'list-1', is_urgent: true, status: 'todo' })
    const bill = makeBill({ id: 'b1' })

    const byList = new Map([['list-1', { list, tasks: [task] }]])
    const items = buildUrgentItemsList(byList, [bill])

    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ kind: 'task', listName: 'Repairs' })
    expect(items[1]).toMatchObject({ kind: 'bill' })
  })

  it('excludes done tasks from the urgent list', () => {
    const list = makeList()
    const doneTask = makeTask({ is_urgent: true, status: 'done' })
    const byList = new Map([['list-1', { list, tasks: [doneTask] }]])
    const items = buildUrgentItemsList(byList, [])
    expect(items).toHaveLength(0)
  })

  it('excludes non-urgent tasks', () => {
    const list = makeList()
    const normalTask = makeTask({ is_urgent: false, status: 'todo' })
    const byList = new Map([['list-1', { list, tasks: [normalTask] }]])
    const items = buildUrgentItemsList(byList, [])
    expect(items).toHaveLength(0)
  })

  it('returns empty list when no urgent tasks or bills', () => {
    const items = buildUrgentItemsList(new Map(), [])
    expect(items).toHaveLength(0)
  })

  it('includes source sub-hub name on task items', () => {
    const list = makeList({ name: 'Weekly Chores' })
    const task = makeTask({ is_urgent: true, status: 'todo' })
    const byList = new Map([['list-1', { list, tasks: [task] }]])
    const items = buildUrgentItemsList(byList, [])
    expect(items).toHaveLength(1)
    const taskItem = items[0]!
    expect(taskItem.kind).toBe('task')
    if (taskItem.kind === 'task') {
      expect(taskItem.listName).toBe('Weekly Chores')
    }
  })
})

// ─── computeNavBadgeCount ──────────────────────────────────────────────────────

describe('computeNavBadgeCount', () => {
  it('counts urgent tasks + overdue bills', () => {
    const tasks: Task[] = [
      makeTask({ is_urgent: true, status: 'todo' }),
      makeTask({ is_urgent: true, status: 'todo' }),
      makeTask({ is_urgent: false, status: 'todo' }),
    ]
    expect(computeNavBadgeCount(tasks, 2)).toBe(4)
  })

  it('excludes done urgent tasks from count', () => {
    const tasks: Task[] = [
      makeTask({ is_urgent: true, status: 'done' }),
      makeTask({ is_urgent: true, status: 'todo' }),
    ]
    expect(computeNavBadgeCount(tasks, 0)).toBe(1)
  })

  it('returns 0 when no urgent items', () => {
    const tasks: Task[] = [
      makeTask({ is_urgent: false }),
      makeTask({ is_urgent: false }),
    ]
    expect(computeNavBadgeCount(tasks, 0)).toBe(0)
  })

  it('handles empty task list', () => {
    expect(computeNavBadgeCount([], 3)).toBe(3)
  })
})

// ─── isTaskOverdue ────────────────────────────────────────────────────────────

describe('isTaskOverdue', () => {
  it('returns true for a past due_date on an active task', () => {
    const task = makeTask({ due_date: YESTERDAY, status: 'todo' })
    expect(isTaskOverdue(task, TODAY)).toBe(true)
  })

  it('returns false for a future due_date', () => {
    const task = makeTask({ due_date: TOMORROW, status: 'todo' })
    expect(isTaskOverdue(task, TODAY)).toBe(false)
  })

  it('returns false for a done task even with past due_date', () => {
    const task = makeTask({ due_date: YESTERDAY, status: 'done' })
    expect(isTaskOverdue(task, TODAY)).toBe(false)
  })

  it('returns false when no due_date', () => {
    const task = makeTask({ due_date: null, status: 'todo' })
    expect(isTaskOverdue(task, TODAY)).toBe(false)
  })

  it('returns false when due today (not yet overdue)', () => {
    const task = makeTask({ due_date: TODAY_STR, status: 'todo' })
    expect(isTaskOverdue(task, TODAY)).toBe(false)
  })
})

// ─── isTaskDueToday ───────────────────────────────────────────────────────────

describe('isTaskDueToday', () => {
  it('returns true when due_date matches today', () => {
    const task = makeTask({ due_date: TODAY_STR })
    expect(isTaskDueToday(task, TODAY)).toBe(true)
  })

  it('returns false when due yesterday', () => {
    const task = makeTask({ due_date: YESTERDAY })
    expect(isTaskDueToday(task, TODAY)).toBe(false)
  })

  it('returns false when due tomorrow', () => {
    const task = makeTask({ due_date: TOMORROW })
    expect(isTaskDueToday(task, TODAY)).toBe(false)
  })

  it('returns false when no due_date', () => {
    const task = makeTask({ due_date: null })
    expect(isTaskDueToday(task, TODAY)).toBe(false)
  })
})

// ─── isBillOverdue ────────────────────────────────────────────────────────────

describe('isBillOverdue', () => {
  it('returns true for pending bill with past due_date', () => {
    const bill = { due_date: YESTERDAY, status: 'pending' }
    expect(isBillOverdue(bill, TODAY)).toBe(true)
  })

  it('returns false for pending bill due today', () => {
    const bill = { due_date: TODAY_STR, status: 'pending' }
    expect(isBillOverdue(bill, TODAY)).toBe(false)
  })

  it('returns false for pending bill due tomorrow', () => {
    const bill = { due_date: TOMORROW, status: 'pending' }
    expect(isBillOverdue(bill, TODAY)).toBe(false)
  })

  it('returns false for non-pending bill even with past due_date', () => {
    const bill = { due_date: YESTERDAY, status: 'paid' }
    expect(isBillOverdue(bill, TODAY)).toBe(false)
  })
})

// ─── getDoneTaskIds ───────────────────────────────────────────────────────────

describe('getDoneTaskIds', () => {
  it('returns IDs of done tasks', () => {
    const tasks: Task[] = [
      makeTask({ id: 'a', status: 'done' }),
      makeTask({ id: 'b', status: 'todo' }),
      makeTask({ id: 'c', status: 'done' }),
    ]
    expect(getDoneTaskIds(tasks)).toEqual(['a', 'c'])
  })

  it('returns empty array when no done tasks', () => {
    const tasks: Task[] = [
      makeTask({ status: 'todo' }),
      makeTask({ status: 'in_progress' }),
    ]
    expect(getDoneTaskIds(tasks)).toHaveLength(0)
  })

  it('returns empty array for empty input', () => {
    expect(getDoneTaskIds([])).toEqual([])
  })
})

// ─── createTaskDefaults ───────────────────────────────────────────────────────

describe('createTaskDefaults', () => {
  it('returns sensible defaults', () => {
    const defaults = createTaskDefaults()
    expect(defaults.title).toBe('')
    expect(defaults.status).toBe('todo')
    expect(defaults.urgency).toBe('low')
    expect(defaults.is_urgent).toBe(false)
    expect(defaults.assignee_id).toBeNull()
    expect(defaults.due_date).toBeNull()
    expect(defaults.description).toBeNull()
    expect(defaults.notes).toBeNull()
  })

  it('overrides are applied', () => {
    const defaults = createTaskDefaults({ urgency: 'critical', is_urgent: true })
    expect(defaults.urgency).toBe('critical')
    expect(defaults.is_urgent).toBe(true)
  })

  it('has created_at and updated_at', () => {
    const defaults = createTaskDefaults()
    expect(defaults.created_at).toBeTruthy()
    expect(defaults.updated_at).toBeTruthy()
  })
})

// ─── isMoreUrgent ─────────────────────────────────────────────────────────────

describe('isMoreUrgent', () => {
  it('critical > high > medium > low', () => {
    expect(isMoreUrgent('critical', 'high')).toBe(true)
    expect(isMoreUrgent('high', 'medium')).toBe(true)
    expect(isMoreUrgent('medium', 'low')).toBe(true)
  })

  it('low is NOT more urgent than medium', () => {
    expect(isMoreUrgent('low', 'medium')).toBe(false)
  })

  it('same urgency returns false', () => {
    for (const u of TASK_URGENCIES) {
      expect(isMoreUrgent(u, u)).toBe(false)
    }
  })
})

// ─── highestUrgency ───────────────────────────────────────────────────────────

describe('highestUrgency', () => {
  it('returns the highest urgency among tasks', () => {
    const tasks: Task[] = [
      makeTask({ urgency: 'low' }),
      makeTask({ urgency: 'critical' }),
      makeTask({ urgency: 'medium' }),
    ]
    expect(highestUrgency(tasks)).toBe('critical')
  })

  it('returns null for empty array', () => {
    expect(highestUrgency([])).toBeNull()
  })

  it('returns the single urgency when only one task', () => {
    expect(highestUrgency([makeTask({ urgency: 'high' })])).toBe('high')
  })

  it('returns low when all tasks are low', () => {
    const tasks: Task[] = [
      makeTask({ urgency: 'low' }),
      makeTask({ urgency: 'low' }),
    ]
    expect(highestUrgency(tasks)).toBe('low')
  })
})

// ─── buildFlashlightRoute ─────────────────────────────────────────────────────

describe('buildFlashlightRoute', () => {
  it('builds the correct route for a task', () => {
    const task = makeTask({ id: 'task-abc', list_id: 'list-xyz' })
    expect(buildFlashlightRoute(task)).toBe('/tasks/list-xyz?flashlight=task-abc')
  })

  it('encodes task and list IDs verbatim (UUIDs have no special chars)', () => {
    const task = makeTask({
      id: '550e8400-e29b-41d4-a716-446655440001',
      list_id: '550e8400-e29b-41d4-a716-446655440002',
    })
    const route = buildFlashlightRoute(task)
    expect(route).toContain('550e8400-e29b-41d4-a716-446655440002')
    expect(route).toContain('550e8400-e29b-41d4-a716-446655440001')
    expect(route).toMatch(/^\/tasks\//)
    expect(route).toContain('flashlight=')
  })
})

// ─── Type completeness checks ─────────────────────────────────────────────────

describe('types — structural checks', () => {
  it('TaskStatus is a valid union', () => {
    const s: TaskStatus = 'todo'
    expect(['todo', 'in_progress', 'done']).toContain(s)
  })

  it('TaskUrgency is a valid union', () => {
    const u: TaskUrgency = 'critical'
    expect(['low', 'medium', 'high', 'critical']).toContain(u)
  })

  it('Task interface has all PRD §8.2 fields', () => {
    const t: Task = makeTask()
    expect(t).toHaveProperty('title')
    expect(t).toHaveProperty('description')
    expect(t).toHaveProperty('status')
    expect(t).toHaveProperty('urgency')
    expect(t).toHaveProperty('is_urgent')
    expect(t).toHaveProperty('assignee_id')
    expect(t).toHaveProperty('due_date')
    expect(t).toHaveProperty('notes')
  })
})
