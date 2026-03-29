/**
 * ActiveListView — The current shopping session's working list.
 *
 * PRD §7.5:
 * - Items toggled from Master List (all master items available)
 * - Checking off: checked items move to bottom of their category section
 * - Un-check moves back up
 * - "Clear session" unchecks all items (§7.5 end of session)
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import BaseModal from '../../shared/BaseModal'
import type { ShoppingItem } from '../../../types/shopping'
import type { ListCategory } from '../../../lib/autoCategorize'
import { groupForActiveList } from '../../../lib/shopping'

interface ActiveListViewProps {
  listId: string
  items: ShoppingItem[]
  onToggleChecked: (item: ShoppingItem) => Promise<void>
  onClearSession: (listId: string) => Promise<void>
}

const CATEGORY_I18N_KEY: Record<ListCategory, string> = {
  dairy: 'category.dairy',
  meat: 'category.meat',
  fish: 'category.fish',
  pantry: 'category.pantry',
  vegetables: 'category.vegetables',
  fruit: 'category.fruit',
  cleaning: 'category.cleaning',
  pharma_hygiene: 'category.pharma_hygiene',
  documents_money: 'category.documents_money',
  other: 'category.other',
}

export default function ActiveListView({
  listId,
  items,
  onToggleChecked,
  onClearSession,
}: ActiveListViewProps) {
  const { t } = useTranslation('shopping')
  const { t: tc } = useTranslation('common')

  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const masterItems = items.filter((i) => i.in_master)
  const groups = groupForActiveList(masterItems)
  const checkedCount = masterItems.filter((i) => i.checked).length
  const allChecked = masterItems.length > 0 && checkedCount === masterItems.length

  async function handleClearSession() {
    setIsClearing(true)
    try {
      await onClearSession(listId)
      setShowClearConfirm(false)
    } finally {
      setIsClearing(false)
    }
  }

  if (masterItems.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-16" data-testid="active-list-view">
        <p className="text-sm text-(--color-muted) text-center">{t('activeList.emptyState')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" data-testid="active-list-view">
      {/* All-done celebration state */}
      {allChecked && (
        <div className="px-4 py-3 bg-(--color-success)/10 border-b border-(--color-success)/20">
          <p className="text-sm text-(--color-success) font-medium text-center">
            {t('activeList.allChecked')}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {groups.map(({ category, unchecked, checked }) => (
          <div key={category}>
            {/* Category header */}
            <div className="px-4 py-2 bg-(--color-background)">
              <p className="text-[11px] font-bold uppercase tracking-wider text-(--color-muted)">
                {t(CATEGORY_I18N_KEY[category])}
              </p>
            </div>

            {/* Unchecked items (top) */}
            {unchecked.map((item) => (
              <ActiveItem
                key={item.id}
                item={item}
                onToggle={() => void onToggleChecked(item)}
              />
            ))}

            {/* Checked items (bottom — visually de-emphasized) */}
            {checked.map((item) => (
              <ActiveItem
                key={item.id}
                item={item}
                onToggle={() => void onToggleChecked(item)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Clear session button */}
      {checkedCount > 0 && (
        <div className="fixed bottom-24 inset-x-4">
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="w-full py-3 rounded-xl bg-(--color-primary) text-white text-sm font-semibold shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
          >
            {t('activeList.clearSession')} ({checkedCount})
          </button>
        </div>
      )}

      {/* Clear confirm modal */}
      <BaseModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title={t('activeList.clearConfirm')}
        footer={
          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="flex-1 py-2.5 rounded-md border border-(--color-muted)/30 text-sm font-semibold text-(--color-muted)"
            >
              {tc('cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleClearSession()}
              disabled={isClearing}
              className="flex-1 py-2.5 rounded-md bg-(--color-primary) text-white text-sm font-semibold disabled:opacity-50"
            >
              {isClearing ? tc('loading') : tc('confirm')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-(--color-muted)">
          {t('activeList.clearMessage', { count: checkedCount })}
        </p>
      </BaseModal>
    </div>
  )
}

// ─── ActiveItem ────────────────────────────────────────────────────────────────

interface ActiveItemProps {
  item: ShoppingItem
  onToggle: () => void
}

function ActiveItem({ item, onToggle }: ActiveItemProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      data-testid="active-item"
      data-checked={item.checked}
      className={[
        'w-full flex items-center gap-3 px-4 py-3',
        'border-b border-(--color-muted)/10 text-start',
        'hover:bg-(--color-muted)/5 active:bg-(--color-muted)/10',
        'transition-colors',
        item.checked ? 'bg-(--color-background)' : 'bg-(--color-surface)',
      ].join(' ')}
    >
      {/* Checkbox circle */}
      <div
        aria-hidden="true"
        className={[
          'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
          item.checked
            ? 'border-(--color-primary) bg-(--color-primary)'
            : 'border-(--color-muted)/40',
        ].join(' ')}
      >
        {item.checked && (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true">
            <path
              d="M1 5l4 4 6-8"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Text */}
      <span
        className={[
          'flex-1 text-sm',
          item.checked
            ? 'line-through text-(--color-muted)'
            : 'text-[#1a1a1a]',
        ].join(' ')}
      >
        {item.text}
      </span>

      {/* Quantity */}
      {item.quantity && (
        <span className="text-xs text-(--color-muted) flex-shrink-0">{item.quantity}</span>
      )}
    </button>
  )
}
