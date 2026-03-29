/**
 * ReservationsHubPage — route: /reservations/:id
 *
 * Two-level view:
 *   1. Sub-Hub grid (ReservationsHub) — shown when no sub-hub is selected.
 *   2. Reservation list — shown when a sub-hub card is tapped.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ReservationsHub from '../components/hubs/reservations/ReservationsHub'
import ReservationCard from '../components/hubs/reservations/ReservationCard'
import ReservationModal from '../components/hubs/reservations/ReservationModal'
import EditModeToolbar from '../components/shared/EditModeToolbar'
import { EditModeContext, useEditModeState } from '../contexts/EditModeContext'
import { useReservations } from '../hooks/useReservations'
import type { SubHub } from '../types/subHub'
import type { Reservation, ReservationFormData } from '../types/reservations'

export default function ReservationsHubPage() {
  const { t } = useTranslation(['reservations', 'common'])
  const navigate = useNavigate()

  const [selectedSubHub, setSelectedSubHub] = useState<SubHub | null>(null)

  // ─── Reservation list level ───────────────────────────────────────────────

  const editModeState = useEditModeState()
  const { isEditMode, selectedIds, selectAll, clearSelection, exitEditMode } = editModeState
  const {
    reservations,
    isLoading: reservationsLoading,
    createReservation,
    updateReservation,
    deleteReservation,
    deleteReservations,
  } = useReservations(selectedSubHub?.id ?? null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null)

  function openCreate() {
    setEditingReservation(null)
    setIsModalOpen(true)
  }

  function openEdit(reservation: Reservation) {
    setEditingReservation(reservation)
    setIsModalOpen(true)
  }

  async function handleSave(data: ReservationFormData) {
    if (editingReservation) {
      await updateReservation(editingReservation.id, data)
    } else {
      await createReservation(data)
    }
  }

  async function handleDelete() {
    if (!editingReservation) return
    await deleteReservation(editingReservation.id)
    setIsModalOpen(false)
    setEditingReservation(null)
  }

  async function handleBulkDelete() {
    await deleteReservations(Array.from(selectedIds))
    exitEditMode()
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  // Level 1: Sub-Hub grid
  if (!selectedSubHub) {
    return (
      <main className="flex flex-col min-h-screen bg-[--color-background]">
        <header className="bg-[--color-primary] px-4 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t('common:back')}
            className="text-white/85 text-xl p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <h1 className="flex-1 text-xl font-bold text-white">{t('reservations:title')}</h1>
        </header>

        <div className="flex-1 px-4 py-4 pb-[100px]">
          <ReservationsHub onSelectSubHub={setSelectedSubHub} />
        </div>
      </main>
    )
  }

  // Level 2: Reservation list
  return (
    <EditModeContext.Provider value={editModeState}>
      <main className="flex flex-col min-h-screen bg-[--color-background]">
        <header className="bg-[--color-primary] px-4 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              exitEditMode()
              setSelectedSubHub(null)
            }}
            aria-label={t('common:back')}
            className="text-white/85 text-xl p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white leading-tight">
              {t('reservations:title')}
            </h1>
            <p className="text-xs text-white/70 truncate">{selectedSubHub.name}</p>
          </div>
        </header>

        <div className="flex-1 px-4 py-4 pb-[100px]">
          {reservationsLoading ? (
            <div className="flex items-center justify-center py-16 text-[--color-muted]">
              {t('common:loading')}
            </div>
          ) : reservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <p className="text-[--color-muted] text-base">{t('reservations:emptySubHub')}</p>
              <button
                type="button"
                onClick={openCreate}
                className="px-4 py-2.5 h-11 rounded-md text-base font-semibold text-white bg-[--color-primary]"
              >
                {t('reservations:addReservation')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reservations.map((r) => (
                <ReservationCard key={r.id} reservation={r} onTap={() => openEdit(r)} />
              ))}
            </div>
          )}
        </div>

        {/* FAB */}
        {!isEditMode && reservations.length > 0 && (
          <button
            type="button"
            onClick={openCreate}
            aria-label={t('reservations:addReservation')}
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
            totalCount={reservations.length}
            onSelectAll={() => selectAll(reservations.map((r) => r.id))}
            onDeselectAll={clearSelection}
            onDelete={() => void handleBulkDelete()}
            onClose={exitEditMode}
            namespace="reservations"
          />
        )}

        {/* Reservation modal */}
        <ReservationModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingReservation(null)
          }}
          onSave={handleSave}
          {...(editingReservation !== null ? { onDelete: () => void handleDelete() } : {})}
          initial={editingReservation}
        />
      </main>
    </EditModeContext.Provider>
  )
}
