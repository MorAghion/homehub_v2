/**
 * MasterListView — The permanent blueprint for a Sub-Hub.
 *
 * PRD §7.4:
 * - Items organized into List-Categories
 * - Add item input with auto-categorization
 * - Duplicate prevention (case-insensitive)
 * - Bulk Delete Mode with Select All / Clear All
 * - Smart Category Learning: Level 1 tag nudge for "other" items (§7.7)
 *   Level 2 re-categorize via edit mode
 */

import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BubbleUI from './BubbleUI'
import BaseModal from '../../shared/BaseModal'
import type { ShoppingItem } from '../../../types/shopping'
import type { ListCategory } from '../../../lib/autoCategorize'
import { ALL_CATEGORIES } from '../../../lib/autoCategorize'
import { groupByCategory, isDuplicate } from '../../../lib/shopping'
import type { Context } from '../../../lib/contextEngine'

interface MasterListViewProps {
  listId: string
  items: ShoppingItem[]
  matchedContexts: Context[]
  onAddItem: (text: string) => Promise<ShoppingItem | null>
  onDeleteItem: (id: string) => Promise<void>
  onDeleteItems: (ids: string[]) => Promise<void>
  onInjectPack: (itemTexts: string[]) => Promise<void>
  onReCategorize: (item: ShoppingItem, category: ListCategory) => Promise<void>
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

export default function MasterListView({
  listId,
  items,
  matchedContexts,
  onAddItem,
  onDeleteItem,
  onDeleteItems,
  onInjectPack,
  onReCategorize,
}: MasterListViewProps) {
  const { t } = useTranslation('shopping')
  const { t: tc } = useTranslation('common')

  const [newItemText, setNewItemText] = useState('')
  const [duplicateError, setDuplicateError] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [bubblesHidden, setBubblesHidden] = useState(false)
  const [recategorizeItem, setRecategorizeItem] = useState<ShoppingItem | null>(null)
  const [nudgeItem, setNudgeItem] = useState<ShoppingItem | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const masterItems = items.filter((i) => i.in_master)
  const groups = groupByCategory(masterItems)
  const showBubbles = masterItems.length === 0 && !bubblesHidden

  async function handleAddItem() {
    const text = newItemText.trim()
    if (!text) return

    if (isDuplicate(text, masterItems)) {
      setDuplicateError(true)
      setTimeout(() => setDuplicateError(false), 2000)
      return
    }

    setIsSaving(true)
    try {
      await onAddItem(text)
      setNewItemText('')
      setBubblesHidden(true)
      inputRef.current?.focus()
    } finally {
      setIsSaving(false)
    }
  }

  async function handleInjectPack(itemTexts: string[]) {
    setIsSaving(true)
    try {
      await onInjectPack(itemTexts)
      setBubblesHidden(true)
    } finally {
      setIsSaving(false)
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleEditMode() {
    setIsEditMode((p) => !p)
    setSelectedIds(new Set())
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    setIsSaving(true)
    try {
      await onDeleteItems([...selectedIds])
      setSelectedIds(new Set())
      setIsEditMode(false)
    } finally {
      setIsSaving(false)
    }
  }

  function selectAll() {
    setSelectedIds(new Set(masterItems.map((i) => i.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function handleReCategorize(category: ListCategory) {
    const item = recategorizeItem ?? nudgeItem
    if (!item) return
    setIsSaving(true)
    try {
      await onReCategorize(item, category)
      setRecategorizeItem(null)
      setNudgeItem(null)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full" data-testid="master-list-view">
      {/* Add item bar */}
      <div className="px-4 py-3 border-b border-(--color-muted)/15 bg-(--color-surface)">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newItemText}
              onChange={(e) => {
                setNewItemText(e.target.value)
                setDuplicateError(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAddItem()
              }}
              placeholder={t('masterList.addPlaceholder')}
              maxLength={120}
              className={[
                'w-full rounded-lg px-3 py-2.5 text-sm bg-(--color-background)',
                'border focus:outline-none focus:ring-1 transition-colors',
                duplicateError
                  ? 'border-(--color-error) focus:border-(--color-error) focus:ring-(--color-error)/20'
                  : 'border-(--color-muted)/20 focus:border-(--color-primary) focus:ring-(--color-primary)/20',
              ].join(' ')}
            />
            {duplicateError && (
              <p className="absolute -bottom-5 start-0 text-xs text-(--color-error)">
                {t('masterList.duplicateError')}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void handleAddItem()}
            disabled={isSaving || !newItemText.trim()}
            aria-label={t('masterList.addItemLabel')}
            className="w-10 h-10 rounded-lg bg-(--color-primary) text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Edit mode toolbar */}
      {isEditMode && (
        <div className="bg-(--color-surface) border-b border-(--color-muted)/15 px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-sm text-(--color-muted)">
              {t('editMode.selected', { count: selectedIds.size })}
            </span>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-semibold text-(--color-primary)"
            >
              {t('masterList.selectAll')}
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs font-semibold text-(--color-muted)"
            >
              {t('masterList.clearAll')}
            </button>
          </div>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => void handleBulkDelete()}
              disabled={isSaving}
              className="text-sm font-semibold text-(--color-error) disabled:opacity-50"
            >
              {t('editMode.deleteSelected')}
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-6">
        {showBubbles ? (
          <BubbleUI
            matchedContexts={matchedContexts}
            onInjectPack={(itemTexts) => void handleInjectPack(itemTexts)}
            onKeepEmpty={() => setBubblesHidden(true)}
          />
        ) : masterItems.length === 0 ? (
          <div className="flex items-center justify-center py-16 px-4">
            <p className="text-sm text-(--color-muted) text-center">{t('masterList.emptyState')}</p>
          </div>
        ) : (
          groups.map(({ category, items: catItems }) => (
            <div key={category}>
              {/* Category header */}
              <div className="px-4 py-2 bg-(--color-background)">
                <p className="text-[11px] font-bold uppercase tracking-wider text-(--color-muted)">
                  {t(CATEGORY_I18N_KEY[category])}
                </p>
              </div>
              {/* Items */}
              {catItems.map((item) => (
                <div
                  key={item.id}
                  data-testid="master-item"
                  className={[
                    'flex items-center gap-3 px-4 py-3',
                    'border-b border-(--color-muted)/10',
                    isEditMode && selectedIds.has(item.id)
                      ? 'bg-(--color-primary)/5'
                      : 'bg-(--color-surface)',
                  ].join(' ')}
                >
                  {/* Edit mode checkbox */}
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={() => toggleSelect(item.id)}
                      className={[
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                        selectedIds.has(item.id)
                          ? 'border-(--color-primary) bg-(--color-primary)'
                          : 'border-(--color-muted)/40 bg-white',
                      ].join(' ')}
                      aria-label={item.text}
                    >
                      {selectedIds.has(item.id) && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  )}

                  {/* Item text */}
                  <span className="flex-1 text-sm text-[#1a1a1a]">{item.text}</span>

                  {/* Level 1 nudge: tag icon for "other" items */}
                  {item.category === 'other' && !isEditMode && (
                    <button
                      type="button"
                      onClick={() => setNudgeItem(item)}
                      aria-label={t('categoryLearning.tagIconLabel')}
                      data-testid="category-tag-icon"
                      className="p-1 rounded text-(--color-muted)/60 hover:text-(--color-primary) transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path
                          d="M2 2h5.5l6.5 6.5-5.5 5.5L2 7.5V2z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                        <circle cx="5" cy="5" r="1" fill="currentColor" />
                      </svg>
                    </button>
                  )}

                  {/* Level 2: re-categorize via edit mode */}
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setRecategorizeItem(item)
                      }}
                      aria-label={t('categoryLearning.tagIconLabel')}
                      className="p-1 rounded text-(--color-muted)/60 hover:text-(--color-primary) transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path
                          d="M1 1h4l7 7-4 4-7-7V1z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                        <circle cx="3.5" cy="3.5" r="1" fill="currentColor" />
                      </svg>
                    </button>
                  )}

                  {/* Delete button (edit mode) */}
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={() => void onDeleteItem(item.id)}
                      aria-label={tc('delete')}
                      className="p-1 rounded text-(--color-muted)/60 hover:text-(--color-error) transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path
                          d="M2 4h10M5 4V2h4v2M5 6v5M9 6v5M3 4l.5 8h7l.5-8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Edit mode FAB / toggle */}
      {!showBubbles && masterItems.length > 0 && (
        <div className="absolute top-4 end-4">
          <button
            type="button"
            onClick={toggleEditMode}
            className="text-sm font-semibold text-(--color-primary) px-3 py-1.5"
          >
            {isEditMode ? t('masterList.doneEditing') : t('masterList.editMode')}
          </button>
        </div>
      )}

      {/* Level 1 Nudge Modal (category.other → re-categorize) */}
      <BaseModal
        isOpen={!!nudgeItem}
        onClose={() => setNudgeItem(null)}
        title={t('categoryLearning.nudgeTitle')}
        footer={
          <button
            type="button"
            onClick={() => setNudgeItem(null)}
            className="w-full py-2.5 rounded-md border border-(--color-muted)/30 text-sm font-semibold text-(--color-muted)"
          >
            {tc('cancel')}
          </button>
        }
      >
        <div>
          <p className="text-sm text-(--color-muted) mb-4">
            {t('categoryLearning.nudgeMessage', { item: nudgeItem?.text ?? '' })}
          </p>
          <div className="flex flex-col gap-1.5">
            {ALL_CATEGORIES.filter((c) => c !== 'other').map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => void handleReCategorize(cat)}
                disabled={isSaving}
                className="w-full text-start px-3 py-2.5 rounded-md text-sm hover:bg-(--color-primary)/5 text-[#1a1a1a] transition-colors"
              >
                {t(CATEGORY_I18N_KEY[cat])}
              </button>
            ))}
          </div>
        </div>
      </BaseModal>

      {/* Level 2 Re-categorize Modal (from edit mode) */}
      <BaseModal
        isOpen={!!recategorizeItem}
        onClose={() => setRecategorizeItem(null)}
        title={t('categoryLearning.nudgeTitle')}
        footer={
          <button
            type="button"
            onClick={() => setRecategorizeItem(null)}
            className="w-full py-2.5 rounded-md border border-(--color-muted)/30 text-sm font-semibold text-(--color-muted)"
          >
            {tc('cancel')}
          </button>
        }
      >
        <div>
          <p className="text-sm text-(--color-muted) mb-4">
            {t('categoryLearning.nudgeMessage', { item: recategorizeItem?.text ?? '' })}
          </p>
          <div className="flex flex-col gap-1.5">
            {ALL_CATEGORIES.filter((c) => c !== 'other').map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => void handleReCategorize(cat)}
                disabled={isSaving}
                className="w-full text-start px-3 py-2.5 rounded-md text-sm hover:bg-(--color-primary)/5 text-[#1a1a1a] transition-colors"
              >
                {t(CATEGORY_I18N_KEY[cat])}
              </button>
            ))}
          </div>
        </div>
      </BaseModal>
    </div>
  )
}
