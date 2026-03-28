/**
 * tasks — business logic for the Tasks Hub.
 *
 * PRD §8: Home Tasks Hub
 * - §8.2: Task fields (title, description, status, urgency, is_urgent, assignee_id, due_date, notes)
 * - §8.3: Urgency system (low/medium/high/critical + is_urgent flag)
 * - §8.4: Urgent Tasks virtual sub-hub (aggregates is_urgent tasks + overdue bills)
 * - §8.5: Flashlight deep-link (source sub-hub navigation)
 * - §8.6: Task actions (create, edit, complete, delete, bulk delete, Clear Completed)
 *
 * Pure business logic — no Supabase, no React, no side-effects.
 * All functions accept injectable `now` timestamps for deterministic testing.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export type TaskUrgency = 'low' | 'medium' | 'high' | 'critical'

export interface Task {
  id: string
  list_id: string
  title: string
  description: string | null
  status: TaskStatus
  urgency: TaskUrgency
  /** When true, task surfaces in the Urgent Tasks virtual sub-hub. */
  is_urgent: boolean
  assignee_id: string | null
  due_date: string | null   // ISO date string "YYYY-MM-DD"
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TaskList {
  id: string
  household_id: string
  name: string
  context: string | null
  created_at: string
  updated_at: string
}

/** Minimal shape for an overdue bill surfaced in the Urgent Tasks view (PRD §8.4). */
export interface OverdueBill {
  id: string
  vendor_name: string
  amount: string
  due_date: string   // ISO date string "YYYY-MM-DD"
  status: 'pending'
}

/** A row in the Urgent Tasks flat list: either an urgent task or an overdue bill. */
export type UrgentItem =
  | { kind: 'task'; task: Task; listName: string }
  | { kind: 'bill'; bill: OverdueBill }

export type TaskValidationError =
  | 'title_required'       // title is empty or whitespace
  | 'title_too_long'       // title > 200 chars
  | 'invalid_status'       // status not in allowed enum
  | 'invalid_urgency'      // urgency not in allowed enum
  | 'invalid_due_date'     // due_date is not a valid ISO date

export interface TaskValidationResult {
  valid: boolean
  errors: TaskValidationError[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done']

export const TASK_URGENCIES: TaskUrgency[] = ['low', 'medium', 'high', 'critical']

/** Numeric weight for sorting urgency levels (higher = more urgent). */
const URGENCY_WEIGHT: Record<TaskUrgency, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
}

const TITLE_MAX_LENGTH = 200

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates task input fields. Returns all errors found (not early-exit).
 *
 * @param input  Partial task data to validate (title + optional fields).
 */
export function validateTask(input: {
  title: string
  status?: string
  urgency?: string
  due_date?: string | null
}): TaskValidationResult {
  const errors: TaskValidationError[] = []

  if (!input.title || input.title.trim().length === 0) {
    errors.push('title_required')
  } else if (input.title.trim().length > TITLE_MAX_LENGTH) {
    errors.push('title_too_long')
  }

  if (input.status !== undefined && !TASK_STATUSES.includes(input.status as TaskStatus)) {
    errors.push('invalid_status')
  }

  if (input.urgency !== undefined && !TASK_URGENCIES.includes(input.urgency as TaskUrgency)) {
    errors.push('invalid_urgency')
  }

  if (input.due_date != null && input.due_date !== '') {
    if (!isValidISODate(input.due_date)) {
      errors.push('invalid_due_date')
    }
  }

  return { valid: errors.length === 0, errors }
}

// ─── Status Transitions ───────────────────────────────────────────────────────

/**
 * Returns the next status when a task's completion toggle is activated.
 * PRD §8.6: toggling complete moves a task to `done`; toggling again
 * reverts it to `todo` (undo pattern).
 */
export function toggleTaskCompletion(current: TaskStatus): TaskStatus {
  return current === 'done' ? 'todo' : 'done'
}

/**
 * Valid manual status transitions (not all pairs are allowed).
 * - todo → in_progress, done
 * - in_progress → todo, done
 * - done → todo (reopen)
 */
export function isValidStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return false
  // done → in_progress is not allowed; must reopen to todo first
  if (from === 'done' && to === 'in_progress') return false
  return true
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

/**
 * Sorts tasks so that `done` tasks sink to the bottom of their list.
 * Within each tier (active vs. done), order is preserved.
 *
 * PRD §8.6: "Checked tasks move to bottom of list."
 *
 * @returns A new array — input is not mutated.
 */
export function sortTasksWithDoneAtBottom(tasks: readonly Task[]): Task[] {
  const active = tasks.filter((t) => t.status !== 'done')
  const done = tasks.filter((t) => t.status === 'done')
  return [...active, ...done]
}

/**
 * Sorts tasks by urgency level descending (critical first, low last).
 * Tasks with equal urgency preserve their original order.
 *
 * @returns A new array — input is not mutated.
 */
export function sortTasksByUrgency(tasks: readonly Task[]): Task[] {
  return [...tasks].sort(
    (a, b) => URGENCY_WEIGHT[b.urgency] - URGENCY_WEIGHT[a.urgency],
  )
}

// ─── Urgent Tasks Aggregation ─────────────────────────────────────────────────

/**
 * Filters tasks that should appear in the Urgent Tasks virtual sub-hub.
 * PRD §8.4: all tasks where `is_urgent = true`.
 */
export function filterUrgentTasks(tasks: readonly Task[]): Task[] {
  return tasks.filter((t) => t.is_urgent)
}

/**
 * Returns a flat list of urgent items for the Urgent Tasks view.
 * Combines urgent tasks and overdue bills into a single ordered list.
 * PRD §8.4: tasks appear first, bills appear second.
 *
 * @param tasksByList  Map of list ID → { list, tasks } pairs
 * @param overdueBills Overdue bills to surface (derived, not stored)
 */
export function buildUrgentItemsList(
  tasksByList: ReadonlyMap<string, { list: TaskList; tasks: readonly Task[] }>,
  overdueBills: readonly OverdueBill[],
): UrgentItem[] {
  const items: UrgentItem[] = []

  for (const { list, tasks } of tasksByList.values()) {
    for (const task of tasks) {
      if (task.is_urgent && task.status !== 'done') {
        items.push({ kind: 'task', task, listName: list.name })
      }
    }
  }

  for (const bill of overdueBills) {
    items.push({ kind: 'bill', bill })
  }

  return items
}

/**
 * Computes the total count displayed on the Tasks nav tab badge.
 * PRD §3.2: red count badge = urgent tasks + overdue bills.
 *
 * @param tasks       All tasks across all sub-hubs
 * @param overdueCount Number of overdue bills
 */
export function computeNavBadgeCount(
  tasks: readonly Task[],
  overdueCount: number,
): number {
  const urgentCount = tasks.filter((t) => t.is_urgent && t.status !== 'done').length
  return urgentCount + overdueCount
}

// ─── Overdue Computation ──────────────────────────────────────────────────────

/**
 * Determines whether a task is overdue.
 * A task is overdue when it has a due_date in the past and is not yet done.
 *
 * @param task  The task to evaluate
 * @param now   Current date (injectable for testing; defaults to today)
 */
export function isTaskOverdue(task: Task, now: Date = new Date()): boolean {
  if (!task.due_date) return false
  if (task.status === 'done') return false
  const due = parseISODate(task.due_date)
  if (!due) return false
  return due < startOfDay(now)
}

/**
 * Determines whether a task is due today.
 *
 * @param task  The task to evaluate
 * @param now   Current date (injectable for testing; defaults to today)
 */
export function isTaskDueToday(task: Task, now: Date = new Date()): boolean {
  if (!task.due_date) return false
  const due = parseISODate(task.due_date)
  if (!due) return false
  const today = startOfDay(now)
  const dueDay = startOfDay(due)
  return dueDay.getTime() === today.getTime()
}

/**
 * Determines whether a bill is overdue.
 * PRD §11 (Bills): overdue = due_date < today AND status = 'pending'.
 *
 * @param bill  The bill to evaluate
 * @param now   Current date (injectable for testing; defaults to today)
 */
export function isBillOverdue(bill: { due_date: string; status: string }, now: Date = new Date()): boolean {
  if (bill.status !== 'pending') return false
  const due = parseISODate(bill.due_date)
  if (!due) return false
  return due < startOfDay(now)
}

// ─── Clear Completed ──────────────────────────────────────────────────────────

/**
 * Returns the IDs of all `done` tasks in the given list.
 * Used to confirm the count before bulk-deleting via "Clear Completed" (PRD §8.6).
 */
export function getDoneTaskIds(tasks: readonly Task[]): string[] {
  return tasks.filter((t) => t.status === 'done').map((t) => t.id)
}

// ─── Default Factory ──────────────────────────────────────────────────────────

/**
 * Creates a sensible default set of fields for a new task.
 * Callers must supply the `id` and `list_id` after DB insertion.
 */
export function createTaskDefaults(overrides: Partial<Omit<Task, 'id' | 'list_id'>> = {}): Omit<Task, 'id' | 'list_id'> {
  const now = new Date().toISOString()
  return {
    title: '',
    description: null,
    status: 'todo',
    urgency: 'low',
    is_urgent: false,
    assignee_id: null,
    due_date: null,
    notes: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

// ─── Urgency Helpers ──────────────────────────────────────────────────────────

/**
 * Returns true if `a` has higher urgency than `b`.
 */
export function isMoreUrgent(a: TaskUrgency, b: TaskUrgency): boolean {
  return URGENCY_WEIGHT[a] > URGENCY_WEIGHT[b]
}

/**
 * Returns the highest urgency level among a set of tasks.
 * Returns `null` if the array is empty.
 */
export function highestUrgency(tasks: readonly Task[]): TaskUrgency | null {
  if (tasks.length === 0) return null
  return tasks.reduce<TaskUrgency>((max, t) => {
    return URGENCY_WEIGHT[t.urgency] > URGENCY_WEIGHT[max] ? t.urgency : max
  }, 'low')
}

// ─── Flashlight ───────────────────────────────────────────────────────────────

/**
 * Resolves the Flashlight deep-link target for an urgent task.
 * Returns the route path to navigate to (the source sub-hub + task anchor).
 *
 * PRD §8.5: navigate to source sub-hub, scroll task into view.
 *
 * Route convention: `/tasks/:listId?flashlight=:taskId`
 */
export function buildFlashlightRoute(task: Task): string {
  return `/tasks/${task.list_id}?flashlight=${task.id}`
}

// ─── Internal Utilities ───────────────────────────────────────────────────────

/** Parses an ISO date string "YYYY-MM-DD" into a Date at UTC midnight. */
function parseISODate(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!match) return null
  const [, year, month, day] = match
  const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (isNaN(d.getTime())) return null
  return d
}

/** Returns midnight of the given date in UTC. */
function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/** Returns true if the string is a valid ISO date "YYYY-MM-DD". */
function isValidISODate(dateStr: string): boolean {
  return parseISODate(dateStr) !== null
}
