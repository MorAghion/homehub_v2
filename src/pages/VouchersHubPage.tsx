/**
 * VouchersHubPage — route: /vouchers/:id
 *
 * Two-level view:
 *   1. Sub-Hub grid (VouchersHub) — shown when no sub-hub is selected.
 *   2. Voucher list — shown when a sub-hub card is tapped.
 *
 * The :id route param is used to deep-link to a specific sub-hub if provided.
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import VouchersHub from '../components/hubs/vouchers/VouchersHub'
import VoucherCard from '../components/hubs/vouchers/VoucherCard'
import VoucherModal from '../components/hubs/vouchers/VoucherModal'
import EditModeToolbar from '../components/shared/EditModeToolbar'
import { EditModeContext, useEditModeState } from '../contexts/EditModeContext'
import { useVouchers } from '../hooks/useVouchers'
import type { SubHub } from '../types/subHub'
import type { Voucher, VoucherFormData } from '../types/vouchers'

export default function VouchersHubPage() {
  const { t } = useTranslation(['vouchers', 'common'])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Selected sub-hub (drives the two-level view)
  const [selectedSubHub, setSelectedSubHub] = useState<SubHub | null>(null)

  // Use route param to pre-select sub-hub on deep-link
  // (when navigating from home page with a known sub-hub id)
  useEffect(() => {
    if (id && id !== 'hub') {
      // Sub-hub selection is driven by VouchersHub providing the SubHub object.
      // If the route provides an id directly, we'll handle it when subHubs load.
      // For now, clear selection so the hub grid shows.
      setSelectedSubHub(null)
    }
  }, [id])

  // ─── Voucher list level ──────────────────────────────────────────────────

  const editModeState = useEditModeState()
  const { isEditMode, selectedIds, selectAll, clearSelection, exitEditMode } = editModeState
  const { vouchers, isLoading: vouchersLoading, createVoucher, updateVoucher, deleteVoucher, deleteVouchers } =
    useVouchers(selectedSubHub?.id ?? null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null)

  function openCreate() {
    setEditingVoucher(null)
    setIsModalOpen(true)
  }

  function openEdit(voucher: Voucher) {
    setEditingVoucher(voucher)
    setIsModalOpen(true)
  }

  async function handleSave(data: VoucherFormData) {
    if (editingVoucher) {
      await updateVoucher(editingVoucher.id, data)
    } else {
      await createVoucher(data)
    }
  }

  async function handleDelete() {
    if (!editingVoucher) return
    await deleteVoucher(editingVoucher.id)
    setIsModalOpen(false)
    setEditingVoucher(null)
  }

  async function handleBulkDelete() {
    await deleteVouchers(Array.from(selectedIds))
    exitEditMode()
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  // Level 1: Sub-Hub grid
  if (!selectedSubHub) {
    return (
      <main className="flex flex-col min-h-screen bg-[--color-background]">
        {/* Header */}
        <header className="bg-[--color-primary] px-4 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t('common:back')}
            className="text-white/85 text-xl p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <h1 className="flex-1 text-xl font-bold text-white">{t('vouchers:title')}</h1>
        </header>

        <div className="flex-1 px-4 py-4 pb-[100px]">
          <VouchersHub onSelectSubHub={setSelectedSubHub} />
        </div>
      </main>
    )
  }

  // Level 2: Voucher list within selected sub-hub
  return (
    <EditModeContext.Provider value={editModeState}>
      <main className="flex flex-col min-h-screen bg-[--color-background]">
        {/* Header */}
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
            <h1 className="text-xl font-bold text-white leading-tight">{t('vouchers:title')}</h1>
            <p className="text-xs text-white/70 truncate">{selectedSubHub.name}</p>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 px-4 py-4 pb-[100px]">
          {vouchersLoading ? (
            <div className="flex items-center justify-center py-16 text-[--color-muted]">
              {t('common:loading')}
            </div>
          ) : vouchers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <p className="text-[--color-muted] text-base">{t('vouchers:emptySubHub')}</p>
              <button
                type="button"
                onClick={openCreate}
                className="px-4 py-2.5 h-11 rounded-md text-base font-semibold text-white bg-[--color-primary]"
              >
                {t('vouchers:addVoucher')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {vouchers.map((v) => (
                <VoucherCard key={v.id} voucher={v} onTap={() => openEdit(v)} />
              ))}
            </div>
          )}
        </div>

        {/* FAB */}
        {!isEditMode && vouchers.length > 0 && (
          <button
            type="button"
            onClick={openCreate}
            aria-label={t('vouchers:addVoucher')}
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
            totalCount={vouchers.length}
            onSelectAll={() => selectAll(vouchers.map((v) => v.id))}
            onDeselectAll={clearSelection}
            onDelete={() => void handleBulkDelete()}
            onClose={exitEditMode}
            namespace="vouchers"
          />
        )}

        {/* Voucher modal */}
        <VoucherModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingVoucher(null)
          }}
          onSave={handleSave}
          {...(editingVoucher !== null ? { onDelete: () => void handleDelete() } : {})}
          initial={editingVoucher}
        />
      </main>
    </EditModeContext.Provider>
  )
}
