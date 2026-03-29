// @vitest-environment jsdom
/**
 * UrgentTasksView component tests.
 * Covers: rendering tasks + bills, empty state, section headers, bill rows.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import UrgentTasksView from './UrgentTasksView'
import type { UrgentItem, Task, OverdueBill } from '../../../lib/tasks'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'urgentTasks.title':       'Urgent Tasks',
        'urgentTasks.subtitle':    `${opts?.['count'] ?? 0} urgent items`,
        'urgentTasks.emptyState':  'No urgent tasks. Nice work!',
        'urgentTasks.tasksSection': 'Urgent Tasks',
        'urgentTasks.billsSection': 'Overdue Bills',
        'urgentTasks.payNow':      'Pay Now',
        'hub.doneEditing':         'Done',
        'urgency.critical':        'Critical',
        'urgency.high':            'High',
        'urgency.medium':          'Medium',
        'urgency.low':             'Low',
        'flashlight.goToSource':   'Go to source',
      }
      return map[key] ?? key
    },
    i18n: { language: 'en' },
  }),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    list_id: 'list-1',
    title: 'Urgent repair',
    description: null,
    status: 'todo',
    urgency: 'high',
    is_urgent: true,
    assignee_id: null,
    due_date: null,
    notes: null,
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

function makeTaskItem(task: Task, listName = 'Weekly Chores'): Extract<UrgentItem, { kind: 'task' }> {
  return { kind: 'task', task, listName }
}

function makeBillItem(bill: OverdueBill): Extract<UrgentItem, { kind: 'bill' }> {
  return { kind: 'bill', bill }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UrgentTasksView', () => {
  describe('empty state', () => {
    it('shows empty state message when no items', () => {
      render(<UrgentTasksView items={[]} isLoading={false} onBack={vi.fn()} />)
      expect(screen.getByTestId('urgent-empty-state')).toBeInTheDocument()
      expect(screen.getByText('No urgent tasks. Nice work!')).toBeInTheDocument()
    })

    it('does not show task/bill rows when empty', () => {
      render(<UrgentTasksView items={[]} isLoading={false} onBack={vi.fn()} />)
      expect(screen.queryByTestId('urgent-task-row')).not.toBeInTheDocument()
      expect(screen.queryByTestId('bill-row')).not.toBeInTheDocument()
    })
  })

  describe('task items', () => {
    it('renders task rows for each urgent task', () => {
      const items: UrgentItem[] = [
        makeTaskItem(makeTask({ id: 'task-1', title: 'Task A' })),
        makeTaskItem(makeTask({ id: 'task-2', title: 'Task B' })),
      ]
      render(<UrgentTasksView items={items} isLoading={false} onBack={vi.fn()} />)
      expect(screen.getAllByTestId('urgent-task-row')).toHaveLength(2)
      expect(screen.getByText('Task A')).toBeInTheDocument()
      expect(screen.getByText('Task B')).toBeInTheDocument()
    })

    it('shows sub-hub label for each task', () => {
      const items: UrgentItem[] = [makeTaskItem(makeTask(), 'Weekly Chores')]
      render(<UrgentTasksView items={items} isLoading={false} onBack={vi.fn()} />)
      expect(screen.getByTestId('subhub-label')).toHaveTextContent('Weekly Chores')
    })

    it('renders urgency badge on task rows', () => {
      const items: UrgentItem[] = [makeTaskItem(makeTask({ urgency: 'critical' }))]
      render(<UrgentTasksView items={items} isLoading={false} onBack={vi.fn()} />)
      expect(screen.getByTestId('urgency-badge')).toHaveTextContent('Critical')
    })

    it('renders flashlight link for each task', () => {
      const items: UrgentItem[] = [makeTaskItem(makeTask())]
      render(<UrgentTasksView items={items} isLoading={false} onBack={vi.fn()} />)
      expect(screen.getByTestId('flashlight-link')).toBeInTheDocument()
    })

    it('shows section header for tasks', () => {
      const items: UrgentItem[] = [makeTaskItem(makeTask())]
      render(<UrgentTasksView items={items} isLoading={false} onBack={vi.fn()} />)
      // "Urgent Tasks" appears in both the page header and the section header
      const matches = screen.getAllByText('Urgent Tasks')
      expect(matches.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('bill items', () => {
    it('renders bill rows for overdue bills', () => {
      const items: UrgentItem[] = [makeBillItem(makeBill())]
      render(<UrgentTasksView items={items} isLoading={false} onBack={vi.fn()} />)
      expect(screen.getByTestId('bill-row')).toBeInTheDocument()
      expect(screen.getByText('Electric Co')).toBeInTheDocument()
      expect(screen.getByText('₪120')).toBeInTheDocument()
    })

    it('shows Pay Now button on bill rows', () => {
      const items: UrgentItem[] = [makeBillItem(makeBill())]
      render(<UrgentTasksView items={items} isLoading={false} onBack={vi.fn()} />)
      expect(screen.getByText('Pay Now')).toBeInTheDocument()
    })

    it('shows bills section header', () => {
      const items: UrgentItem[] = [makeBillItem(makeBill())]
      render(<UrgentTasksView items={items} isLoading={false} onBack={vi.fn()} />)
      expect(screen.getByText('Overdue Bills')).toBeInTheDocument()
    })
  })

  describe('mixed content', () => {
    it('renders both tasks and bills', () => {
      const items: UrgentItem[] = [
        makeTaskItem(makeTask({ title: 'Fix the roof' })),
        makeBillItem(makeBill({ vendor_name: 'Gas Co' })),
      ]
      render(<UrgentTasksView items={items} isLoading={false} onBack={vi.fn()} />)
      expect(screen.getByTestId('urgent-task-row')).toBeInTheDocument()
      expect(screen.getByTestId('bill-row')).toBeInTheDocument()
      expect(screen.getByText('Fix the roof')).toBeInTheDocument()
      expect(screen.getByText('Gas Co')).toBeInTheDocument()
    })

    it('subtitle shows total item count', () => {
      const items: UrgentItem[] = [
        makeTaskItem(makeTask()),
        makeBillItem(makeBill()),
      ]
      render(<UrgentTasksView items={items} isLoading={false} onBack={vi.fn()} />)
      // subtitle shows count of all items
      expect(screen.getByText('2 urgent items')).toBeInTheDocument()
    })
  })

  describe('header', () => {
    it('shows header title', () => {
      render(<UrgentTasksView items={[]} isLoading={false} onBack={vi.fn()} />)
      expect(screen.getByText('Urgent Tasks')).toBeInTheDocument()
    })

    it('calls onBack when back button clicked', async () => {
      const user = userEvent.setup()
      const onBack = vi.fn()
      render(<UrgentTasksView items={[]} isLoading={false} onBack={onBack} />)
      await user.click(screen.getByRole('button'))
      expect(onBack).toHaveBeenCalledOnce()
    })
  })

  describe('loading state', () => {
    it('does not show empty state while loading', () => {
      render(<UrgentTasksView items={[]} isLoading={true} onBack={vi.fn()} />)
      expect(screen.queryByTestId('urgent-empty-state')).not.toBeInTheDocument()
    })
  })
})
