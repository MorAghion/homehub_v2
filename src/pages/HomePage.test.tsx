// @vitest-environment jsdom
/**
 * HomePage component tests.
 * Covers: renders 4 hub cards, Attention Banner visibility, navigation.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import HomePage from './HomePage'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('react-i18next', () => ({
  useTranslation: (_ns?: string) => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'dashboard.title': 'Home',
        'hubs.shopping': 'Shopping',
        'hubs.tasks': 'Tasks',
        'hubs.vouchers': 'Vouchers',
        'hubs.reservations': 'Reservations',
        'attentionBanner.message_other': `${opts?.count ?? 0} items need your attention`,
        'attentionBanner.cta': 'View Urgent',
      }
      return map[key] ?? key
    },
    i18n: { language: 'en' },
  }),
}))

let mockUrgentCount = 0

vi.mock('../contexts/AuthContext', () => ({
  useSession: () => ({ household: { id: 'hh-1' } }),
}))

vi.mock('../hooks/useUrgentTasks', () => ({
  useUrgentTasks: () => ({
    urgentItems: [],
    totalCount: mockUrgentCount,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('HomePage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockUrgentCount = 0
  })

  describe('hub cards grid', () => {
    it('renders all 4 hub cards', () => {
      render(<HomePage />)
      expect(screen.getByTestId('hub-card-shopping')).toBeDefined()
      expect(screen.getByTestId('hub-card-tasks')).toBeDefined()
      expect(screen.getByTestId('hub-card-vouchers')).toBeDefined()
      expect(screen.getByTestId('hub-card-reservations')).toBeDefined()
    })

    it('renders hub card labels', () => {
      render(<HomePage />)
      expect(screen.getByText('Shopping')).toBeDefined()
      expect(screen.getByText('Tasks')).toBeDefined()
      expect(screen.getByText('Vouchers')).toBeDefined()
      expect(screen.getByText('Reservations')).toBeDefined()
    })

    it('navigates to /tasks when Tasks card clicked', async () => {
      const user = userEvent.setup()
      render(<HomePage />)
      await user.click(screen.getByTestId('hub-card-tasks'))
      expect(mockNavigate).toHaveBeenCalledWith('/tasks')
    })

    it('navigates to /shopping when Shopping card clicked', async () => {
      const user = userEvent.setup()
      render(<HomePage />)
      await user.click(screen.getByTestId('hub-card-shopping'))
      expect(mockNavigate).toHaveBeenCalledWith('/shopping')
    })

    it('navigates to /vouchers when Vouchers card clicked', async () => {
      const user = userEvent.setup()
      render(<HomePage />)
      await user.click(screen.getByTestId('hub-card-vouchers'))
      expect(mockNavigate).toHaveBeenCalledWith('/vouchers')
    })

    it('navigates to /reservations when Reservations card clicked', async () => {
      const user = userEvent.setup()
      render(<HomePage />)
      await user.click(screen.getByTestId('hub-card-reservations'))
      expect(mockNavigate).toHaveBeenCalledWith('/reservations')
    })
  })

  describe('Attention Banner (§3.3)', () => {
    it('does not render banner when urgentCount is 0', () => {
      mockUrgentCount = 0
      render(<HomePage />)
      expect(screen.queryByTestId('attention-banner')).toBeNull()
    })

    it('renders banner when urgentCount > 0', () => {
      mockUrgentCount = 3
      render(<HomePage />)
      expect(screen.getByTestId('attention-banner')).toBeDefined()
    })

    it('shows item count in banner text', () => {
      mockUrgentCount = 7
      render(<HomePage />)
      expect(screen.getByText('7 items need your attention')).toBeDefined()
    })

    it('navigates to /tasks/urgent when banner clicked', async () => {
      mockUrgentCount = 2
      const user = userEvent.setup()
      render(<HomePage />)
      await user.click(screen.getByTestId('attention-banner'))
      expect(mockNavigate).toHaveBeenCalledWith('/tasks/urgent')
    })
  })
})
