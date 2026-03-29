/**
 * VoucherCard — a single voucher displayed in the 2-column grid.
 *
 * Shows: name, code (tap to copy), expiry date (color-coded), value, image icon.
 * Color-coded accent strip at top based on expiry status.
 * Tapping the card opens the detail/edit modal (via onTap).
 * Tapping the copy icon copies the code to clipboard.
 */

import { useTranslation } from 'react-i18next'
import type { Voucher } from '../../../types/vouchers'
import { getExpiryStatus, formatExpiryDate } from '../../../lib/vouchers'

interface VoucherCardProps {
  voucher: Voucher
  onTap: () => void
}

// Accent strip color by expiry status
const ACCENT_CLASSES: Record<string, string> = {
  ok: 'bg-[linear-gradient(90deg,#065F46,#10B981)]',
  soon: 'bg-[linear-gradient(90deg,#D97706,#F59E0B)]',
  urgent: 'bg-[linear-gradient(90deg,#991B1B,#EF4444)]',
  expired: 'bg-[--color-muted]/30',
  none: 'bg-[linear-gradient(90deg,#1E40AF,#3B82F6)]',
}

const EXPIRY_TEXT_CLASSES: Record<string, string> = {
  ok: 'text-[--color-success]',
  soon: 'text-[#D97706]',
  urgent: 'text-[#EA580C]',
  expired: 'text-[--color-error]',
  none: 'text-[--color-muted]',
}

export default function VoucherCard({ voucher, onTap }: VoucherCardProps) {
  const { t } = useTranslation('vouchers')

  const expiryStatus = getExpiryStatus(voucher.expiry_date)
  const isExpired = expiryStatus === 'expired'
  const formattedExpiry = formatExpiryDate(voucher.expiry_date)

  async function handleCopyCode(e: React.MouseEvent) {
    e.stopPropagation()
    if (!voucher.code) return
    try {
      await navigator.clipboard.writeText(voucher.code)
    } catch {
      // Clipboard API may fail silently — swallow
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onTap()
      }}
      className={[
        'relative bg-[--color-surface] rounded-xl shadow-sm overflow-hidden',
        'flex flex-col cursor-pointer select-none',
        'transition-shadow active:shadow-md',
        isExpired ? 'opacity-65' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Accent strip */}
      <div className={`h-1 w-full ${ACCENT_CLASSES[expiryStatus]}`} aria-hidden="true" />

      {/* Body */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        {/* Top row: issuer + icons */}
        <div className="flex items-start justify-between gap-1">
          <span className="text-[10px] font-bold text-[--color-muted] uppercase tracking-wide">
            {voucher.name}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {voucher.image_url && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
                className="text-[--color-muted]"
              >
                <rect
                  x="1"
                  y="1"
                  width="12"
                  height="12"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <circle cx="4.5" cy="4.5" r="1" fill="currentColor" />
                <path
                  d="M1 9l3-3 3 3 2-2 4 4"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {voucher.code && (
              <button
                type="button"
                onClick={handleCopyCode}
                aria-label={t('copyCode')}
                className="p-0.5 text-[--color-muted] hover:text-[--color-primary] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <rect
                    x="4"
                    y="4"
                    width="9"
                    height="9"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M1 10V2a1 1 0 011-1h8"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Value */}
        {voucher.value && (
          <span
            className={`text-xl font-extrabold tracking-tight leading-none ${isExpired ? 'text-[--color-muted]' : 'text-[--color-primary]'}`}
          >
            {voucher.value}
          </span>
        )}

        {/* Expiry row */}
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[11px] text-[--color-muted]">{t('expiryLabel')}</span>
          <span className={`text-[11px] font-semibold ${EXPIRY_TEXT_CLASSES[expiryStatus]}`}>
            {expiryStatus === 'expired'
              ? t('expired')
              : formattedExpiry ?? t('noExpiry')}
          </span>
        </div>
      </div>
    </div>
  )
}
