/**
 * ReservationCard — a single reservation displayed in the list.
 *
 * Full-width horizontal layout: colored date block on the left, details on the right.
 * Shows: restaurant name, date, party size, notes icon, link icon.
 * Upcoming/Past badge based on date.
 */

import { useTranslation } from 'react-i18next'
import type { Reservation } from '../../../types/reservations'
import {
  getReservationStatus,
  formatReservationDateBlock,
} from '../../../lib/reservations'

interface ReservationCardProps {
  reservation: Reservation
  onTap: () => void
}

// Date block background by status
const DATE_BLOCK_BG: Record<string, string> = {
  upcoming: 'bg-[--color-primary]',
  past: 'bg-[--color-muted]',
}

export default function ReservationCard({ reservation, onTap }: ReservationCardProps) {
  const { t } = useTranslation('reservations')
  const status = getReservationStatus(reservation.reservation_date)
  const dateBlock = formatReservationDateBlock(reservation.reservation_date)
  const isPast = status === 'past'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onTap()
      }}
      className={[
        'flex bg-[--color-surface] rounded-xl shadow-sm overflow-hidden',
        'cursor-pointer select-none transition-shadow active:shadow-md',
        isPast ? 'opacity-65' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Date block */}
      <div
        className={`${DATE_BLOCK_BG[status]} w-16 shrink-0 flex flex-col items-center justify-center px-2 py-3`}
        aria-hidden="true"
      >
        {dateBlock ? (
          <>
            <span className="text-[26px] font-extrabold text-white leading-none">
              {dateBlock.day}
            </span>
            <span className="text-[11px] font-semibold text-white/85 uppercase tracking-wide mt-0.5">
              {dateBlock.month}
            </span>
          </>
        ) : (
          <span className="text-xs font-semibold text-white/70">{t('noDate')}</span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 px-3 py-3 flex flex-col justify-center gap-0.5 min-w-0">
        {/* Badge */}
        <span
          className={[
            'self-start text-[10px] font-bold rounded-sm px-1.5 py-0.5',
            isPast
              ? 'bg-[--color-muted]/12 text-[--color-muted]'
              : 'bg-[--color-success]/10 text-[--color-success]',
          ].join(' ')}
        >
          {isPast ? t('past') : t('upcoming')}
        </span>

        {/* Name */}
        <span className="text-base font-semibold text-[#1a1a1a] truncate leading-snug">
          {reservation.restaurant_name}
        </span>

        {/* Meta */}
        <div className="flex flex-col gap-0.5">
          {reservation.party_size !== null && (
            <span className="text-xs text-[--color-muted] flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <circle cx="4" cy="3" r="2" stroke="currentColor" strokeWidth="1.2" />
                <path
                  d="M1 10c0-2 1.3-3.5 3-3.5s3 1.5 3 3.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <circle cx="9" cy="3" r="1.5" stroke="currentColor" strokeWidth="1" />
                <path
                  d="M7 10c0-1.5.9-2.5 2-2.5"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
              </svg>
              {reservation.party_size}
            </span>
          )}
          {reservation.notes && (
            <span className="text-xs text-[--color-muted] truncate">{reservation.notes}</span>
          )}
        </div>
      </div>

      {/* Right icons */}
      <div className="flex flex-col items-center justify-center gap-2 px-3">
        {reservation.image_url && (
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden="true"
            className="text-[--color-muted]"
          >
            <rect
              x="1"
              y="1"
              width="16"
              height="16"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <circle cx="5.5" cy="5.5" r="1.5" fill="currentColor" />
            <path
              d="M1 12l4-4 4 4 3-3 5 5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {reservation.smart_paste_url && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="text-[--color-muted]"
          >
            <path
              d="M6 10l4-4M9 4h3v3M4 8H2a1 1 0 00-1 1v5a1 1 0 001 1h5a1 1 0 001-1v-2"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </div>
  )
}
