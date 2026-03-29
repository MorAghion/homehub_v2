/**
 * VoucherCard — displays a single voucher in the grid.
 *
 * Shows: name, code (tap to copy), expiry date (red if ≤7 days), value, image thumbnail.
 * PRD §9.2
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Voucher } from '../../../types/vouchers'

interface VoucherCardProps {
  voucher: Voucher
  isSelected?: boolean
  isEditMode?: boolean
  onClick: (voucher: Voucher) => void
  onToggleSelect?: (id: string) => void
}

/** Returns days until expiry. Negative = expired. */
function daysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate + 'T00:00:00Z')
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatExpiry(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function VoucherCard({
  voucher,
  isSelected = false,
  isEditMode = false,
  onClick,
  onToggleSelect,
}: VoucherCardProps) {
  const { t } = useTranslation('vouchers')
  const [copied, setCopied] = useState(false)

  const days = voucher.expiry_date ? daysUntilExpiry(voucher.expiry_date) : null
  const isExpiringSoon = days !== null && days >= 0 && days <= 7
  const isExpired = days !== null && days < 0

  async function handleCopyCode(e: React.MouseEvent) {
    e.stopPropagation()
    if (!voucher.code) return
    try {
      await navigator.clipboard.writeText(voucher.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable — silently ignore
    }
  }

  function handleClick() {
    if (isEditMode && onToggleSelect) {
      onToggleSelect(voucher.id)
    } else {
      onClick(voucher)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      aria-pressed={isEditMode ? isSelected : undefined}
      data-testid="voucher-card"
      className={[
        'relative flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all',
        'border shadow-sm',
        isSelected
          ? 'border-2 border-(--color-primary) bg-(--color-primary)/5'
          : 'border-transparent bg-(--color-surface) hover:shadow-md',
      ].join(' ')}
    >
      {/* Image thumbnail */}
      {voucher.image_url ? (
        <img
          src={voucher.image_url}
          alt={t('card.imageAlt')}
          className="w-full h-24 object-cover"
        />
      ) : (
        <div className="w-full h-24 bg-(--color-muted)/10 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true" className="text-(--color-muted)/30">
            <rect x="4" y="8" width="24" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M4 13h24" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 18h4M18 18h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {/* Content */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        {/* Name + value */}
        <div className="flex items-start justify-between gap-1">
          <p className="text-[13px] font-semibold text-[#1a1a1a] leading-snug line-clamp-2 flex-1">
            {voucher.name}
          </p>
          {voucher.value && (
            <span className="text-[12px] font-bold text-(--color-primary) flex-shrink-0 ms-1">
              {voucher.value}
            </span>
          )}
        </div>

        {/* Code row */}
        {voucher.code ? (
          <button
            type="button"
            onClick={handleCopyCode}
            aria-label={copied ? t('card.codeCopied') : t('card.copyCode')}
            className="flex items-center gap-1.5 text-xs font-mono text-(--color-muted) bg-(--color-muted)/8 rounded px-2 py-1 w-full text-start hover:bg-(--color-muted)/15 transition-colors truncate"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="flex-shrink-0">
              <rect x="1" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <path d="M3 1h7a1 1 0 0 1 1 1v7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span className="truncate">{copied ? t('card.codeCopied') : voucher.code}</span>
          </button>
        ) : (
          <span className="text-xs text-(--color-muted)/50 italic">{t('card.noCode')}</span>
        )}

        {/* Expiry date */}
        {voucher.expiry_date ? (
          <p
            className={[
              'text-[11px] font-medium',
              isExpired
                ? 'text-(--color-error)'
                : isExpiringSoon
                ? 'text-(--color-urgency-high)'
                : 'text-(--color-muted)',
            ].join(' ')}
            data-testid="expiry-label"
          >
            {isExpired
              ? t('card.expired')
              : isExpiringSoon && days !== null
              ? t('card.expiresIn', { days })
              : `${t('card.expiresLabel')}: ${formatExpiry(voucher.expiry_date)}`}
          </p>
        ) : (
          <p className="text-[11px] text-(--color-muted)/50">{t('card.noExpiry')}</p>
        )}
      </div>

      {/* Edit mode checkbox overlay */}
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
