// @vitest-environment jsdom
/**
 * FlashlightLink component tests.
 * Covers: renders link, navigation call, aria-label, applyFlashlightGlow utility.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import FlashlightLink, { applyFlashlightGlow } from './FlashlightLink'
import type { Task } from '../../../lib/tasks'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'flashlight.goToSource': 'Go to source',
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
    list_id: 'list-42',
    title: 'Paint the fence',
    description: null,
    status: 'todo',
    urgency: 'low',
    is_urgent: true,
    assignee_id: null,
    due_date: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FlashlightLink', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
  })

  describe('rendering', () => {
    it('renders a button with flashlight-link testid', () => {
      render(<FlashlightLink task={makeTask()} listName="Weekly Chores" />)
      expect(screen.getByTestId('flashlight-link')).toBeInTheDocument()
    })

    it('has accessible aria-label with list name', () => {
      render(<FlashlightLink task={makeTask()} listName="Repairs" />)
      expect(screen.getByTestId('flashlight-link')).toHaveAttribute(
        'aria-label',
        'Go to source: Repairs',
      )
    })
  })

  describe('navigation', () => {
    it('navigates to flashlight route on click', async () => {
      const user = userEvent.setup()
      const task = makeTask({ id: 'task-99', list_id: 'list-77' })
      render(<FlashlightLink task={task} listName="Repairs" />)
      await user.click(screen.getByTestId('flashlight-link'))
      expect(mockNavigate).toHaveBeenCalledWith('/tasks/list-77?flashlight=task-99')
    })

    it('navigates on keyboard Enter', async () => {
      const user = userEvent.setup()
      const task = makeTask({ id: 'task-5', list_id: 'list-8' })
      render(<FlashlightLink task={task} listName="Chores" />)
      screen.getByTestId('flashlight-link').focus()
      await user.keyboard('{Enter}')
      expect(mockNavigate).toHaveBeenCalledWith('/tasks/list-8?flashlight=task-5')
    })

    it('navigates on keyboard Space', async () => {
      const user = userEvent.setup()
      const task = makeTask({ id: 'task-5', list_id: 'list-8' })
      render(<FlashlightLink task={task} listName="Chores" />)
      screen.getByTestId('flashlight-link').focus()
      await user.keyboard(' ')
      expect(mockNavigate).toHaveBeenCalledWith('/tasks/list-8?flashlight=task-5')
    })
  })
})

describe('applyFlashlightGlow', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    // jsdom doesn't implement scrollIntoView — polyfill it
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.restoreAllMocks()
  })

  it('adds flashlight-glow class to matching element', () => {
    const el = document.createElement('div')
    el.setAttribute('data-task-id', 'task-abc')
    container.appendChild(el)

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
    vi.spyOn(window, 'setTimeout').mockImplementation(() => {
      return 0 as unknown as ReturnType<typeof setTimeout>
    })

    applyFlashlightGlow('task-abc')

    expect(el.classList.contains('flashlight-glow')).toBe(true)
  })

  it('does nothing when element is not found', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
    expect(() => applyFlashlightGlow('nonexistent-task')).not.toThrow()
  })

  it('scrolls element into view', () => {
    const el = document.createElement('div')
    el.setAttribute('data-task-id', 'task-scroll')
    container.appendChild(el)

    const scrollSpy = vi.spyOn(el, 'scrollIntoView').mockImplementation(() => {})
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
    vi.spyOn(window, 'setTimeout').mockImplementation(() => 0 as unknown as ReturnType<typeof setTimeout>)

    applyFlashlightGlow('task-scroll')

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
  })
})
