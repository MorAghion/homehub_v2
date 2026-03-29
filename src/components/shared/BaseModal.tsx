/**
 * BaseModal — wrapper for all modal / bottom-sheet dialogs.
 *
 * Uses a native <dialog> element for accessibility (focus trap, Escape key).
 * On mobile, renders as a bottom sheet (slides up from bottom).
 * RTL: uses logical CSS properties throughout.
 */

import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export default function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
}: BaseModalProps) {
  const { t } = useTranslation('common')
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [isOpen])

  // Close on backdrop click
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      onClose()
    }
  }

  // Close on native dialog cancel (Escape key)
  function handleCancel(e: React.SyntheticEvent<HTMLDialogElement>) {
    e.preventDefault()
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className={[
        'fixed inset-x-0 bottom-0 m-0 w-full max-w-lg mx-auto',
        'rounded-t-xl bg-(--color-surface) shadow-xl',
        'p-0 max-h-[90vh] overflow-y-auto',
        'backdrop:bg-black/50',
        'open:animate-slide-up',
      ].join(' ')}
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-(--color-muted)/20">
        <h2
          id="modal-title"
          className="flex-1 text-base font-semibold text-[#1a1a1a]"
        >
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="p-1 rounded-md text-(--color-muted) hover:text-[#1a1a1a] transition-colors"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M15 5L5 15M5 5l10 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-4">{children}</div>

      {/* Footer */}
      {footer && (
        <div className="flex items-center gap-3 px-4 pb-6 pt-2 border-t border-(--color-muted)/20">
          {footer}
        </div>
      )}
    </dialog>
  )
}
