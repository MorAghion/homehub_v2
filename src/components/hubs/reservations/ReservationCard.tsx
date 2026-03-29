/**
 * ReservationCard — displays a single reservation in the grid.
 *
 * Shows: restaurant name, date, party size, notes, image thumbnail.
 * PRD §10.2
 */

import { useTranslation } from 'react-i18next'
import type { Reservation } from '../../../types/reservations'

interface ReservationCardProps {
  reservation: Reservation
  isSelected?: boolean
  isEditMode?: boolean
  onClick: (reservation: Reservation) => void
  onToggleSelect?: (id: string) => void
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00Z')
  const now = new Date()
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  )
}

function isTomorrow(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00Z')
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  return (
    d.getUTCFullYear() === tomorrow.getUTCFullYear() &&
    d.getUTCMonth() === tomorrow.getUTCMonth() &&
    d.getUTCDate() === tomorrow.getUTCDate()
  )
}

export default function ReservationCard({
  reservation,
  isSelected = false,
  isEditMode = false,
  onClick,
  onToggleSelect,
}: ReservationCardProps) {
  const { t } = useTranslation('reservations')

  function handleClick() {
    if (isEditMode && onToggleSelect) {
      onToggleSelect(reservation.id)
    } else {
      onClick(reservation)
    }
  }

  let dateLabel = t('card.noDate')
  if (reservation.event_date) {
    if (isToday(reservation.event_date)) {
      dateLabel = t('card.today')
    } else if (isTomorrow(reservation.event_date)) {
      dateLabel = t('card.tomorrow')
    } else {
      dateLabel = formatDate(reservation.event_date)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      aria-pressed={isEditMode ? isSelected : undefined}
      data-testid="reservation-card"
      className={[
        'relative flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all',
        'border shadow-sm',
        isSelected
          ? 'border-2 border-(--color-primary) bg-(--color-primary)/5'
          : 'border-transparent bg-(--color-surface) hover:shadow-md',
      ].join(' ')}
    >
      {/* Image thumbnail */}
      {reservation.image_url ? (
        <img
          src={reservation.image_url}
          alt={t('card.imageAlt')}
          className="w-full h-24 object-cover"
        />
      ) : (
        <div className="w-full h-24 bg-(--color-muted)/10 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true" className="text-(--color-muted)/30">
            <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.5" />
            <path d="M16 10v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Content */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        {/* Name */}
        <p className="text-[13px] font-semibold text-[#1a1a1a] leading-snug line-clamp-2">
          {reservation.name}
        </p>

        {/* Date + time */}
        <div className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="text-(--color-muted) flex-shrink-0">
            <rect x="1" y="2" width="10" height="9" rx="1" stroke="currentColor" strokeWidth="1" />
            <path d="M4 1v2M8 1v2M1 5h10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
          <span
            className={[
              'text-[11px] font-medium',
              reservation.event_date && (isToday(reservation.event_date) || isTomorrow(reservation.event_date))
                ? 'text-(--color-primary)'
                : 'text-(--color-muted)',
            ].join(' ')}
            data-testid="date-label"
          >
            {dateLabel}
            {reservation.time && ` · ${reservation.time}`}
          </span>
        </div>

        {/* Party size */}
        {reservation.party_size && (
          <p className="text-[11px] text-(--color-muted)">
            {t('card.partySize', { count: reservation.party_size })}
          </p>
        )}

        {/* Notes snippet */}
        {reservation.notes && (
          <p className="text-[11px] text-(--color-muted) line-clamp-1">{reservation.notes}</p>
        )}
      </div>

      {/* Edit mode checkbox */}
      {isEditMode && (
        <div
          className={[
            'absolute top-2 start-2 w-5 h-5 rounded-full border-2 flex items-center justify-center',
            'bg-white/90',
            isSelected
              ? 'border-(--color-primary) bg-(--color-primary)'
              : 'border-(--color-muted)/40',
          ].join(' ')}
          aria-hidden="true"
        >
          {isSelected && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
              <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}
    </div>
  )
}
