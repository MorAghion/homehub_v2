/**
 * TasksHub — main Tasks Hub screen.
 *
 * Shows:
 *   - Urgent Tasks virtual sub-hub pinned at top (§8.4)
 *   - Grid of task list sub-hub cards
 *   - FAB to create new task list
 *   - Edit mode with bulk delete and Clear Completed
 *
 * Mockup: tasks-hub.html
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import BaseModal from '../../shared/BaseModal'
import type { TasksHubMutations } from '../../../hooks/useTasksHub'
import type { UrgentItem, TaskList } from '../../../lib/tasks'

interface TasksHubProps {
  taskLists: TaskList[]
  tasksByListId: Record<string, import('../../../lib/tasks').Task[]>
  urgentItems: UrgentItem[]
  isLoading: boolean
  mutations: TasksHubMutations
}

export default function TasksHub({
  taskLists,
  tasksByListId,
  urgentItems,
  isLoading,
  mutations,
}: TasksHubProps) {
  const { t } = useTranslation('tasks')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()

  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState<TaskList | null>(null)
  const [newListName, setNewListName] = useState('')
  const [editListName, setEditListName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<TaskList | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const urgentCount = urgentItems.length

  function toggleEditMode() {
    setIsEditMode((prev) => !prev)
    setSelectedListIds(new Set())
  }

  function toggleSelectList(id: string) {
    setSelectedListIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function navigateToList(listId: string) {
    navigate(`/tasks/${listId}`)
  }

  function navigateToUrgent() {
    navigate('/tasks/urgent')
  }

  async function handleCreateList() {
    if (!newListName.trim()) return
    setIsSaving(true)
    setError(null)
    try {
      await mutations.createList(newListName.trim())
      setNewListName('')
      setShowCreateModal(false)
    } catch {
      setError(tc('saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpdateList() {
    if (!showEditModal || !editListName.trim()) return
    setIsSaving(true)
    setError(null)
    try {
      await mutations.updateList(showEditModal.id, editListName.trim())
      setShowEditModal(null)
    } catch {
      setError(tc('saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteList() {
    if (!showDeleteConfirm) return
    setIsSaving(true)
    try {
      await mutations.deleteList(showDeleteConfirm.id)
      setShowDeleteConfirm(null)
      setSelectedListIds((prev) => {
        const next = new Set(prev)
        next.delete(showDeleteConfirm.id)
        return next
      })
    } catch {
      setError(tc('deleteError'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleBulkDelete() {
    if (selectedListIds.size === 0) return
    setIsSaving(true)
    try {
      for (const id of selectedListIds) {
        await mutations.deleteList(id)
      }
      setSelectedListIds(new Set())
      setIsEditMode(false)
    } catch {
      setError(tc('deleteError'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[--color-background]">
        <p className="text-sm text-[--color-muted]">{tc('loading')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[--color-background]">
      {/* Header */}
      <header className="bg-[--color-primary] px-4 py-4 flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white leading-tight">{t('hub.title')}</h1>
          <p className="text-xs text-white/70 mt-0.5">
            {t('hub.subtitle', { count: taskLists.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleEditMode}
          className="text-white/85 hover:text-white text-sm font-semibold px-3 py-1.5 rounded-md transition-colors"
        >
          {isEditMode ? t('hub.doneEditing') : t('hub.editMode')}
        </button>
      </header>

      {/* Edit mode toolbar */}
      {isEditMode && selectedListIds.size > 0 && (
        <div className="bg-[--color-surface] border-b border-[--color-muted]/15 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-[#1a1a1a]">
            {t('editMode.selected', { count: selectedListIds.size })}
          </span>
          <button
            type="button"
            onClick={() => void handleBulkDelete()}
            disabled={isSaving}
            className="text-sm font-semibold text-[--color-error] disabled:opacity-50"
          >
            {t('editMode.deleteSelected')}
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-[--color-error]/10 border-b border-[--color-error]/20 px-4 py-2">
          <p className="text-xs text-[--color-error]">{error}</p>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 px-4 py-4 pb-24 flex flex-col gap-3">
        {/* Urgent Tasks virtual card — always pinned at top */}
        <button
          type="button"
          onClick={navigateToUrgent}
          data-testid="urgent-tasks-card"
          className="w-full flex items-center gap-3.5 p-4 rounded-xl border border-[--color-urgency-critical]/30 bg-red-50 shadow-sm cursor-pointer text-start hover:shadow-md transition-shadow"
        >
          <div className="w-11 h-11 rounded-[10px] bg-[--color-urgency-critical] flex items-center justify-center flex-shrink-0">
            <span className="text-xl" aria-hidden="true">⚡</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[--color-urgency-critical] uppercase tracking-wide mb-0.5">
              {t('urgentTasks.title')}
            </p>
            <p className="text-base font-semibold text-[#1a1a1a]">
              {t('urgentTasks.subtitle', { count: urgentCount })}
            </p>
          </div>
          {urgentCount > 0 && (
            <div
              className="w-9 h-9 rounded-full bg-[--color-urgency-critical] flex items-center justify-center flex-shrink-0"
              aria-label={`${urgentCount} urgent items`}
            >
              <span className="text-lg font-extrabold text-white leading-none">{urgentCount}</span>
            </div>
          )}
        </button>

        {/* Sub-hub grid */}
        {taskLists.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <p className="text-sm text-[--color-muted] text-center">{t('hub.emptyState')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {taskLists.map((list) => {
              const tasks = tasksByListId[list.id] ?? []
              const activeCount = tasks.filter((t) => t.status !== 'done').length
              const isSelected = selectedListIds.has(list.id)

              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => {
                    if (isEditMode) {
                      toggleSelectList(list.id)
                    } else {
                      navigateToList(list.id)
                    }
                  }}
                  data-testid="subhub-card"
                  className={[
                    'relative flex flex-col justify-between p-4 rounded-xl text-start',
                    'min-h-[90px] cursor-pointer transition-all',
                    isSelected
                      ? 'bg-[--color-primary]/10 border-2 border-[--color-primary]'
                      : 'bg-[--color-surface] border border-transparent shadow-sm hover:shadow-md',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-end mb-2">
                    {activeCount > 0 && (
                      <span className="text-[11px] font-bold rounded-full px-2 py-0.5 bg-[--color-primary]/10 text-[--color-primary]">
                        {activeCount}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[#1a1a1a] leading-snug mb-0.5">
                      {list.name}
                    </p>
                    <p className="text-xs text-[--color-muted]">
                      {t('subHub.tasks', { count: tasks.length })}
                    </p>
                  </div>

                  {/* Long-press edit indicator */}
                  {isEditMode && (
                    <div
                      className={[
                        'absolute top-2 start-2 w-5 h-5 rounded-full border-2 flex items-center justify-center',
                        isSelected
                          ? 'border-[--color-primary] bg-[--color-primary]'
                          : 'border-[--color-muted]/40 bg-white',
                      ].join(' ')}
                      aria-hidden="true"
                    >
                      {isSelected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  )}

                  {/* Edit/delete actions */}
                  {isEditMode && !isSelected && (
                    <div className="absolute top-2 end-2 flex gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditListName(list.name)
                          setShowEditModal(list)
                        }}
                        className="p-1 rounded text-[--color-muted] hover:text-[--color-primary] transition-colors"
                        aria-label={t('subHub.editTitle')}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M9.5 1.5L12.5 4.5L5 12H2v-3L9.5 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowDeleteConfirm(list)
                        }}
                        className="p-1 rounded text-[--color-muted] hover:text-[--color-error] transition-colors"
                        aria-label={tc('delete')}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M2 4h10M5 4V2h4v2M5 6v5M9 6v5M3 4l.5 8h7l.5-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </main>

      {/* FAB — add new sub-hub */}
      {!isEditMode && (
        <button
          type="button"
          onClick={() => {
            setNewListName('')
            setShowCreateModal(true)
          }}
          aria-label={t('hub.newSubHub')}
          className={[
            'fixed bottom-24 end-4 w-14 h-14 rounded-full',
            'bg-[--color-primary] text-white shadow-lg',
            'flex items-center justify-center',
            'hover:opacity-90 active:scale-95 transition-all',
          ].join(' ')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {/* Create list modal */}
      <BaseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('subHub.createTitle')}
        footer={
          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 py-2.5 rounded-md border border-[--color-muted]/30 text-sm font-semibold text-[--color-muted]"
            >
              {tc('cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleCreateList()}
              disabled={isSaving || !newListName.trim()}
              className="flex-1 py-2.5 rounded-md bg-[--color-primary] text-white text-sm font-semibold disabled:opacity-50"
            >
              {isSaving ? tc('loading') : tc('save')}
            </button>
          </div>
        }
      >
        <div>
          <label className="block text-xs font-medium text-[--color-muted] mb-1.5">
            {t('subHub.createLabel')}
          </label>
          <input
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleCreateList() }}
            placeholder={t('subHub.createPlaceholder')}
            maxLength={100}
            autoFocus
            className="w-full rounded-md px-3 py-2.5 text-sm bg-[--color-background] border border-[--color-muted]/20 focus:outline-none focus:border-[--color-primary] focus:ring-1 focus:ring-[--color-primary]/20 transition-colors"
          />
        </div>
      </BaseModal>

      {/* Edit list modal */}
      <BaseModal
        isOpen={!!showEditModal}
        onClose={() => setShowEditModal(null)}
        title={t('subHub.editTitle')}
        footer={
          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowEditModal(null)}
              className="flex-1 py-2.5 rounded-md border border-[--color-muted]/30 text-sm font-semibold text-[--color-muted]"
            >
              {tc('cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleUpdateList()}
              disabled={isSaving || !editListName.trim()}
              className="flex-1 py-2.5 rounded-md bg-[--color-primary] text-white text-sm font-semibold disabled:opacity-50"
            >
              {isSaving ? tc('loading') : tc('save')}
            </button>
          </div>
        }
      >
        <div>
          <label className="block text-xs font-medium text-[--color-muted] mb-1.5">
            {t('subHub.createLabel')}
          </label>
          <input
            type="text"
            value={editListName}
            onChange={(e) => setEditListName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleUpdateList() }}
            maxLength={100}
            autoFocus
            className="w-full rounded-md px-3 py-2.5 text-sm bg-[--color-background] border border-[--color-muted]/20 focus:outline-none focus:border-[--color-primary] focus:ring-1 focus:ring-[--color-primary]/20 transition-colors"
          />
        </div>
      </BaseModal>

      {/* Delete list confirm modal */}
      <BaseModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title={t('subHub.deleteConfirm')}
        footer={
          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(null)}
              className="flex-1 py-2.5 rounded-md border border-[--color-muted]/30 text-sm font-semibold text-[--color-muted]"
            >
              {tc('cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteList()}
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-md bg-[--color-error] text-white text-sm font-semibold disabled:opacity-50"
            >
              {isSaving ? tc('loading') : tc('delete')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-[--color-muted]">{t('subHub.deleteMessage')}</p>
      </BaseModal>
    </div>
  )
}
