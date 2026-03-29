// @vitest-environment jsdom
/**
 * BottomNav component tests.
 * Covers: renders 4 tabs, active tab highlighting, Tasks badge, navigation.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BottomNav from './BottomNav'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
let mockPathname = '/'

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'nav.shopping': 'Shopping',
        'nav.tasks': 'Tasks',
        'nav.vouchers': 'Vouchers',
        'nav.reservations': 'Reservations',
      }
      return map[key] ?? key
    },
    i18n: { language: 'en' },
  }),
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BottomNav', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockPathname = '/'
  })

  describe('rendering', () => {
    it('renders all 4 tabs', () => {
      render(<BottomNav />)
      expect(screen.getByTestId('nav-tab-shopping')).toBeDefined()
      expect(screen.getByTestId('nav-tab-tasks')).toBeDefined()
      expect(screen.getByTestId('nav-tab-vouchers')).toBeDefined()
      expect(screen.getByTestId('nav-tab-reservations')).toBeDefined()
    })

    it('renders tab labels', () => {
      render(<BottomNav />)
      expect(screen.getByText('Shopping')).toBeDefined()
      expect(screen.getByText('Tasks')).toBeDefined()
      expect(screen.getByText('Vouchers')).toBeDefined()
      expect(screen.getByText('Reservations')).toBeDefined()
    })
  })

  describe('active state', () => {
    it('marks Tasks tab active when on /tasks', () => {
      mockPathname = '/tasks'
      render(<BottomNav />)
      const tasksTab = screen.getByTestId('nav-tab-tasks')
      expect(tasksTab.getAttribute('aria-current')).toBe('page')
    })

    it('marks Tasks tab active when on /tasks/urgent', () => {
      mockPathname = '/tasks/urgent'
      render(<BottomNav />)
      const tasksTab = screen.getByTestId('nav-tab-tasks')
      expect(tasksTab.getAttribute('aria-current')).toBe('page')
    })

    it('marks Shopping tab active when on /shopping', () => {
      mockPathname = '/shopping'
      render(<BottomNav />)
      const shoppingTab = screen.getByTestId('nav-tab-shopping')
      expect(shoppingTab.getAttribute('aria-current')).toBe('page')
    })

    it('does not mark Tasks active when on other routes', () => {
      mockPathname = '/vouchers'
      render(<BottomNav />)
      const tasksTab = screen.getByTestId('nav-tab-tasks')
      expect(tasksTab.getAttribute('aria-current')).toBeNull()
    })
  })

  describe('Tasks badge', () => {
    it('does not render badge when urgentCount is 0', () => {
      render(<BottomNav urgentCount={0} />)
      expect(screen.queryByTestId('tasks-badge')).toBeNull()
    })

    it('does not render badge when urgentCount is undefined', () => {
      render(<BottomNav />)
      expect(screen.queryByTestId('tasks-badge')).toBeNull()
    })

    it('renders badge with count when urgentCount > 0', () => {
      render(<BottomNav urgentCount={5} />)
      const badge = screen.getByTestId('tasks-badge')
      expect(badge).toBeDefined()
      expect(badge.textContent).toBe('5')
    })

    it('renders 99+ when count exceeds 99', () => {
      render(<BottomNav urgentCount={150} />)
      const badge = screen.getByTestId('tasks-badge')
      expect(badge.textContent).toBe('99+')
    })
  })

  describe('navigation', () => {
    it('navigates to /tasks when Tasks tab clicked', async () => {
      const user = userEvent.setup()
      render(<BottomNav />)
      await user.click(screen.getByTestId('nav-tab-tasks'))
      expect(mockNavigate).toHaveBeenCalledWith('/tasks')
    })

    it('navigates to /shopping when Shopping tab clicked', async () => {
      const user = userEvent.setup()
      render(<BottomNav />)
      await user.click(screen.getByTestId('nav-tab-shopping'))
      expect(mockNavigate).toHaveBeenCalledWith('/shopping')
    })

    it('navigates to /vouchers when Vouchers tab clicked', async () => {
      const user = userEvent.setup()
      render(<BottomNav />)
      await user.click(screen.getByTestId('nav-tab-vouchers'))
      expect(mockNavigate).toHaveBeenCalledWith('/vouchers')
    })

    it('navigates to /reservations when Reservations tab clicked', async () => {
      const user = userEvent.setup()
      render(<BottomNav />)
      await user.click(screen.getByTestId('nav-tab-reservations'))
      expect(mockNavigate).toHaveBeenCalledWith('/reservations')
    })
  })
})
