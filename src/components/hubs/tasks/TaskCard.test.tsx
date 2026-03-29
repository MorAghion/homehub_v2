// @vitest-environment jsdom
/**
 * TaskCard component tests.
 * Covers: urgency badge colors, status indicators, is_urgent flag, due date display.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import TaskCard from './TaskCard'
import type { Task } from '../../../lib/tasks'
import type { UserProfile } from '../../../types/user'

// ─── i18n mock ────────────────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'urgency.low':      'Low',
        'urgency.medium':   'Medium',
        'urgency.high':     'High',
        'urgency.critical': 'Critical',
        'taskCard.overdue':  'Overdue',
        'taskCard.dueToday': 'Due today',
        'taskCard.urgentFlag': 'Urgent',
        'taskCard.due': `Due ${opts?.['date'] ?? ''}`,
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
    title: 'Fix the leak',
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

const NO_MEMBERS: UserProfile[] = []

const MEMBERS: UserProfile[] = [
  { id: 'user-1', household_id: 'hh-1', display_name: 'Alice', role: 'owner', created_at: '2026-01-01T00:00:00Z' },
  { id: 'user-2', household_id: 'hh-1', display_name: 'Bob', role: 'member', created_at: '2026-01-01T00:00:00Z' },
]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TaskCard', () => {
  describe('rendering', () => {
    it('renders task title', () => {
      render(<TaskCard task={makeTask()} members={NO_MEMBERS} onClick={vi.fn()} />)
      expect(screen.getByText('Fix the leak')).toBeInTheDocument()
    })

    it('renders urgency badge for each level', () => {
      const cases: Array<{ urgency: 'low' | 'medium' | 'high' | 'critical'; label: string }> = [
        { urgency: 'low',      label: 'Low' },
        { urgency: 'medium',   label: 'Medium' },
        { urgency: 'high',     label: 'High' },
        { urgency: 'critical', label: 'Critical' },
      ]
      for (const { urgency, label } of cases) {
        const { unmount } = render(
          <TaskCard task={makeTask({ urgency })} members={NO_MEMBERS} onClick={vi.fn()} />,
        )
        expect(screen.getByTestId('urgency-badge')).toHaveTextContent(label)
        unmount()
      }
    })

    it('shows ⚡ icon for urgent tasks', () => {
      render(<TaskCard task={makeTask({ is_urgent: true })} members={NO_MEMBERS} onClick={vi.fn()} />)
      expect(screen.getByTitle('Urgent')).toBeInTheDocument()
    })

    it('does not show ⚡ icon when is_urgent is false', () => {
      render(<TaskCard task={makeTask({ is_urgent: false })} members={NO_MEMBERS} onClick={vi.fn()} />)
      expect(screen.queryByTitle('Urgent')).not.toBeInTheDocument()
    })

    it('does not show ⚡ icon for done urgent tasks', () => {
      render(
        <TaskCard task={makeTask({ is_urgent: true, status: 'done' })} members={NO_MEMBERS} onClick={vi.fn()} />,
      )
      expect(screen.queryByTitle('Urgent')).not.toBeInTheDocument()
    })

    it('shows "Overdue" for past due tasks', () => {
      render(
        <TaskCard
          task={makeTask({ due_date: '2020-01-01', status: 'todo' })}
          members={NO_MEMBERS}
          onClick={vi.fn()}
        />,
      )
      expect(screen.getByText('Overdue')).toBeInTheDocument()
    })

    it('shows "Due today" for tasks due today', () => {
      const today = new Date().toISOString().slice(0, 10)
      render(
        <TaskCard
          task={makeTask({ due_date: today, status: 'todo' })}
          members={NO_MEMBERS}
          onClick={vi.fn()}
        />,
      )
      expect(screen.getByText('Due today')).toBeInTheDocument()
    })

    it('applies line-through to done task title', () => {
      render(<TaskCard task={makeTask({ status: 'done' })} members={NO_MEMBERS} onClick={vi.fn()} />)
      const title = screen.getByText('Fix the leak')
      expect(title).toHaveClass('line-through')
    })

    it('shows assignee display name when assigned', () => {
      render(
        <TaskCard task={makeTask({ assignee_id: 'user-1' })} members={MEMBERS} onClick={vi.fn()} />,
      )
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    it('does not show assignee when unassigned', () => {
      render(<TaskCard task={makeTask()} members={MEMBERS} onClick={vi.fn()} />)
      expect(screen.queryByText('Alice')).not.toBeInTheDocument()
      expect(screen.queryByText('Bob')).not.toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onClick when clicked', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      render(<TaskCard task={makeTask()} members={NO_MEMBERS} onClick={onClick} />)
      await user.click(screen.getByTestId('task-card'))
      expect(onClick).toHaveBeenCalledOnce()
      expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-1' }))
    })

    it('calls onClick via keyboard Enter', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      render(<TaskCard task={makeTask()} members={NO_MEMBERS} onClick={onClick} />)
      screen.getByTestId('task-card').focus()
      await user.keyboard('{Enter}')
      expect(onClick).toHaveBeenCalledOnce()
    })

    it('in edit mode: calls onToggleSelect instead of onClick', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      const onToggleSelect = vi.fn()
      render(
        <TaskCard
          task={makeTask()}
          members={NO_MEMBERS}
          isEditMode
          onClick={onClick}
          onToggleSelect={onToggleSelect}
        />,
      )
      await user.click(screen.getByTestId('task-card'))
      expect(onToggleSelect).toHaveBeenCalledWith('task-1')
      expect(onClick).not.toHaveBeenCalled()
    })

    it('in edit mode: shows checkbox', () => {
      render(
        <TaskCard
          task={makeTask()}
          members={NO_MEMBERS}
          isEditMode
          onClick={vi.fn()}
        />,
      )
      // Checkbox is rendered (aria-hidden div)
      const card = screen.getByTestId('task-card')
      expect(card).toBeInTheDocument()
      // The checkbox div should be present
      expect(card.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
    })

    it('selected card has aria-pressed=true in edit mode', () => {
      render(
        <TaskCard
          task={makeTask()}
          members={NO_MEMBERS}
          isEditMode
          isSelected
          onClick={vi.fn()}
        />,
      )
      expect(screen.getByTestId('task-card')).toHaveAttribute('aria-pressed', 'true')
    })
  })
})
