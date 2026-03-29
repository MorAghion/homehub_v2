/**
 * ReservationsHub — Sub-Hub grid for the Reservations hub.
 *
 * Shows a responsive grid of Sub-Hub cards (e.g. "Ontopo", "Movies & Shows").
 * Supports edit mode (long-press to enter, bulk delete via EditModeToolbar).
 * A FAB opens the create-sub-hub modal.
 * Tapping a sub-hub card calls onSelectSubHub to drill into that group.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import HubGrid from '../../shared/HubGrid'
import SubHubCard from '../../shared/SubHubCard'
import EditModeToolbar from '../../shared/EditModeToolbar'
import BaseModal from '../../shared/BaseModal'
import { EditModeContext, useEditModeState } from '../../../contexts/EditModeContext'
import { useReservationsHub } from '../../../hooks/useReservationsHub'
import type { SubHub } from '../../../types/subHub'

interface ReservationsHubProps {
  onSelectSubHub: (subHub: SubHub) => void
}

export default function ReservationsHub({ onSelectSubHub }: ReservationsHubProps) {
  const { t } = useTranslation(['reservations', 'common'])
  const editModeState = useEditModeState()
  const { isEditMode, selectedIds, selectAll, clearSelection, exitEditMode } = editModeState
  const { subHubs, isLoading, createSubHub, deleteSubHubs } = useReservationsHub()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleCreateSubHub() {
    if (!newName.trim()) return
    try {
      setIsSaving(true)
      const subHub = await createSubHub(newName)
      setIsCreateOpen(false)
      setNewName('')
      onSelectSubHub(subHub)
    } catch {
      // Error surfaced via hook
    } finally {
      setIsSaving(false)
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    try {
      setIsDeleting(true)
      await deleteSubHubs(ids)
      exitEditMode()
    } catch {
      // Error surfaced via hook
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-[--color-muted]">
        {t('common:loading')}
      </div>
    )
  }

  return (
    <EditModeContext.Provider value={editModeState}>
      <div className="relative min-h-full">
        {subHubs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <p className="text-[--color-muted] text-base">{t('reservations:empty')}</p>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2.5 h-11 rounded-md text-base font-semibold text-white bg-[--color-primary]"
            >
              {t('reservations:subHub.new')}
            </button>
          </div>
        ) : (
          <HubGrid>
            {subHubs.map((subHub) => (
              <SubHubCard
                key={subHub.id}
                subHub={subHub}
                onTap={() => onSelectSubHub(subHub)}
                onLongPress={() => {}}
              />
            ))}
          </HubGrid>
        )}

        {/* FAB */}
        {!isEditMode && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            aria-label={t('reservations:subHub.new')}
            className={[
              'fixed bottom-[calc(64px+16px)] end-4',
              'w-[52px] h-[52px] rounded-full',
              'bg-[--color-primary] text-white',
              'flex items-center justify-center text-2xl',
              'shadow-[0_4px_12px_rgba(99,6,6,0.35)]',
              'z-[25]',
            ].join(' ')}
          >
            +
          </button>
        )}

        {/* Edit mode toolbar */}
        {isEditMode && (
          <EditModeToolbar
            selectedCount={selectedIds.size}
            totalCount={subHubs.length}
            onSelectAll={() => selectAll(subHubs.map((s) => s.id))}
            onDeselectAll={clearSelection}
            onDelete={() => void handleBulkDelete()}
            onClose={exitEditMode}
            namespace="reservations"
          />
        )}

        {/* Create sub-hub modal */}
        <BaseModal
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false)
            setNewName('')
          }}
          title={t('reservations:subHub.new')}
          footer={
            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false)
                  setNewName('')
                }}
                className="px-4 py-2.5 h-11 rounded-md text-base font-semibold text-[--color-primary] border border-[--color-primary] bg-[--color-surface]"
              >
                {t('common:cancel')}
              </button>
              <button
                type="button"
                onClick={() => void handleCreateSubHub()}
                disabled={isSaving || !newName.trim()}
                className="flex-1 h-11 rounded-md text-base font-semibold text-white bg-[--color-primary] disabled:opacity-50"
              >
                {isSaving ? t('common:loading') : t('common:save')}
              </button>
            </div>
          }
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('reservations:subHub.namePlaceholder')}
            maxLength={80}
            autoFocus
            className="w-full h-11 rounded-md border border-[--color-muted]/40 bg-[--color-surface] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreateSubHub()
            }}
          />
        </BaseModal>

        {isDeleting && (
          <div className="fixed inset-0 z-[--z-overlay] flex items-center justify-center bg-black/40">
            <p className="bg-[--color-surface] rounded-xl px-6 py-4 text-base shadow-xl">
              {t('common:loading')}
            </p>
          </div>
        )}
      </div>
    </EditModeContext.Provider>
  )
}
