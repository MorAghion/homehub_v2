// @vitest-environment jsdom
/**
 * ReservationCard component tests.
 * Covers: name/date rendering, today/tomorrow labels, party size, edit mode.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import ReservationCard from './ReservationCard'
import type { Reservation } from '../../../types/reservations'

// ─── i18n mock ────────────────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'card.imageAlt': 'Reservation image',
        'card.partySize': `${opts?.['count'] ?? 0} guests`,
        'card.noDate': 'No date set',
        'card.today': 'Today',
        'card.tomorrow': 'Tomorrow',
        'card.dateLabel': 'Date',
      }
      return map[key] ?? key
    },
    i18n: { language: 'en' },
  }),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────
function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'r-1',
    household_id: 'hh-1',
    name: 'Manta Ray',
    event_date: null,
    time: '19:30',
    address: 'Herbert Samuel 1, Tel Aviv',
    party_size: null,
    image_url: null,
    notes: null,
    list_id: 'list-1',
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function todayIso(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function tomorrowIso(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('ReservationCard', () => {
  describe('rendering', () => {
    it('renders reservation name', () => {
      render(<ReservationCard reservation={makeReservation()} onClick={vi.fn()} />)
      expect(screen.getByText('Manta Ray')).toBeInTheDocument()
    })

    it('shows "No date set" when event_date is null', () => {
      render(<ReservationCard reservation={makeReservation({ event_date: null })} onClick={vi.fn()} />)
      expect(screen.getByTestId('date-label')).toHaveTextContent('No date set')
    })

    it('shows "Today" for today\'s date', () => {
      render(
        <ReservationCard reservation={makeReservation({ event_date: todayIso() })} onClick={vi.fn()} />,
      )
      expect(screen.getByTestId('date-label')).toHaveTextContent('Today')
    })

    it('shows "Tomorrow" for tomorrow\'s date', () => {
      render(
        <ReservationCard reservation={makeReservation({ event_date: tomorrowIso() })} onClick={vi.fn()} />,
      )
      expect(screen.getByTestId('date-label')).toHaveTextContent('Tomorrow')
    })

    it('shows formatted date for other dates', () => {
      render(
        <ReservationCard reservation={makeReservation({ event_date: '2099-12-25' })} onClick={vi.fn()} />,
      )
      // Should show something like "Thu, Dec 25"
      expect(screen.getByTestId('date-label')).toBeInTheDocument()
    })

    it('shows time alongside date', () => {
      render(
        <ReservationCard
          reservation={makeReservation({ event_date: todayIso(), time: '20:00' })}
          onClick={vi.fn()}
        />,
      )
      expect(screen.getByTestId('date-label')).toHaveTextContent('· 20:00')
    })

    it('shows party size when present', () => {
      render(
        <ReservationCard reservation={makeReservation({ party_size: 4 })} onClick={vi.fn()} />,
      )
      expect(screen.getByText('4 guests')).toBeInTheDocument()
    })

    it('does not show party size when null', () => {
      render(<ReservationCard reservation={makeReservation({ party_size: null })} onClick={vi.fn()} />)
      expect(screen.queryByText(/guests/)).not.toBeInTheDocument()
    })

    it('shows notes snippet when present', () => {
      render(
        <ReservationCard reservation={makeReservation({ notes: 'Confirmation: XYZ' })} onClick={vi.fn()} />,
      )
      expect(screen.getByText('Confirmation: XYZ')).toBeInTheDocument()
    })

    it('renders image when image_url is present', () => {
      render(
        <ReservationCard
          reservation={makeReservation({ image_url: 'https://example.com/img.jpg' })}
          onClick={vi.fn()}
        />,
      )
      expect(screen.getByAltText('Reservation image')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onClick when card is clicked (non-edit mode)', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      render(<ReservationCard reservation={makeReservation()} onClick={onClick} />)
      await user.click(screen.getByTestId('reservation-card'))
      expect(onClick).toHaveBeenCalledOnce()
      expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'r-1' }))
    })

    it('calls onClick via keyboard Enter', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      render(<ReservationCard reservation={makeReservation()} onClick={onClick} />)
      screen.getByTestId('reservation-card').focus()
      await user.keyboard('{Enter}')
      expect(onClick).toHaveBeenCalledOnce()
    })

    it('in edit mode: calls onToggleSelect instead of onClick', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      const onToggleSelect = vi.fn()
      render(
        <ReservationCard
          reservation={makeReservation()}
          onClick={onClick}
          isEditMode
          onToggleSelect={onToggleSelect}
        />,
      )
      await user.click(screen.getByTestId('reservation-card'))
      expect(onToggleSelect).toHaveBeenCalledWith('r-1')
      expect(onClick).not.toHaveBeenCalled()
    })

    it('selected card has aria-pressed=true in edit mode', () => {
      render(
        <ReservationCard
          reservation={makeReservation()}
          onClick={vi.fn()}
          isEditMode
          isSelected
        />,
      )
      expect(screen.getByTestId('reservation-card')).toHaveAttribute('aria-pressed', 'true')
    })

    it('shows checkbox overlay in edit mode', () => {
      render(
        <ReservationCard reservation={makeReservation()} onClick={vi.fn()} isEditMode />,
      )
      const card = screen.getByTestId('reservation-card')
      expect(card.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
    })
  })
})
