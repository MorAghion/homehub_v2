/**
 * EditModeToolbar — fixed bottom toolbar shown when a hub is in edit mode.
 *
 * Provides bulk select-all, bulk delete, and exit-edit-mode actions.
 * No knowledge of what is being deleted — all actions are callbacks.
 *
 * Layout: fixed above bottom nav, z-[--z-toast].
 */

import { useTranslation } from 'react-i18next'

interface EditModeToolbarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onDelete: () => void
  onClose: () => void
  namespace?: string   // i18n namespace for "editMode.*" keys (default 'common')
}

export default function EditModeToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onClose,
  namespace = 'common',
}: EditModeToolbarProps) {
  const { t } = useTranslation(namespace)
  const allSelected = selectedCount === totalCount && totalCount > 0

  return (
    <div
      className={[
        'fixed inset-x-0 bottom-[64px] z-[--z-toast]',
        'bg-[--color-surface] border-t border-[--color-muted]/20',
        'flex items-center justify-between px-4 py-3 gap-3',
        'shadow-lg',
      ].join(' ')}
      role="toolbar"
      aria-label="Edit mode toolbar"
    >
      {/* Select-all / deselect-all toggle */}
      <button
        type="button"
        onClick={allSelected ? onDeselectAll : onSelectAll}
        className="text-sm font-semibold text-[--color-primary] min-h-[44px] px-2"
      >
        {allSelected
          ? t('editMode.deselectAll', { defaultValue: 'Deselect all' })
          : t('editMode.selectAll', { defaultValue: 'Select all' })}
      </button>

      {/* Delete button */}
      <button
        type="button"
        onClick={onDelete}
        disabled={selectedCount === 0}
        className={[
          'flex-1 h-11 rounded-md text-base font-semibold transition-colors',
          selectedCount > 0
            ? 'bg-[--color-error] text-white'
            : 'bg-[--color-muted]/20 text-[--color-muted] cursor-not-allowed',
        ].join(' ')}
      >
        {t('editMode.deleteSelected', { defaultValue: 'Delete' })}
        {selectedCount > 0 ? ` (${selectedCount})` : ''}
      </button>

      {/* Close / exit edit mode */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Exit edit mode"
        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[--color-muted] hover:text-[#1a1a1a] transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M15 5L5 15M5 5l10 10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
