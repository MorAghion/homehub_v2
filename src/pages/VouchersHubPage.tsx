/**
 * VouchersHubPage — route-level page for the Vouchers Hub.
 *
 * Routes:
 *   /vouchers        → main hub grid (VouchersHub component)
 *   /vouchers/:id    → voucher list view for a specific sub-hub
 */

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSession } from '../contexts/AuthContext'
import { useVouchersHub } from '../hooks/useVouchersHub'
import { useVouchers } from '../hooks/useVouchers'
import VouchersHub from '../components/hubs/vouchers/VouchersHub'
import VoucherCard from '../components/hubs/vouchers/VoucherCard'
import VoucherModal from '../components/hubs/vouchers/VoucherModal'
import type { Voucher, VoucherInput } from '../types/vouchers'

export default function VouchersHubPage() {
  const { id: listId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('vouchers')
  const { t: tc } = useTranslation('common')
  const { household } = useSession()

  const hub = useVouchersHub(household?.id ?? null)
  const vouchersData = useVouchers(listId ?? null, household?.id ?? null)

  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pageError, setPageError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // ─── Sub-hub list view ────────────────────────────────────────────────────
  if (listId) {
    const currentList = hub.voucherLists.find((l) => l.id === listId)

    function toggleSelect(id: string) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }

    async function handleSaveVoucher(input: VoucherInput, imageFile?: File) {
      setIsSaving(true)
      try {
        let imageUrl: string | undefined
        if (imageFile && household?.id) {
          imageUrl = await vouchersData.uploadImage(imageFile, household.id)
        }

        const fullInput = imageUrl
          ? { ...input, image_url: imageUrl }
          : input

        if (selectedVoucher) {
          await vouchersData.updateVoucher(selectedVoucher.id, fullInput as Partial<VoucherInput>)
          setSelectedVoucher(null)
        } else {
          await vouchersData.createVoucher(input)
          setShowCreateModal(false)
        }
      } catch {
        setPageError(tc('saveError'))
      } finally {
        setIsSaving(false)
      }
    }

    async function handleDeleteVoucher() {
      if (!selectedVoucher) return
      try {
        await vouchersData.deleteVoucher(selectedVoucher.id)
        setSelectedVoucher(null)
      } catch {
        setPageError(tc('deleteError'))
      }
    }

    async function handleBulkDelete() {
      setIsSaving(true)
      try {
        for (const id of selectedIds) {
          await vouchersData.deleteVoucher(id)
        }
        setSelectedIds(new Set())
        setIsEditMode(false)
      } catch {
        setPageError(tc('deleteError'))
      } finally {
        setIsSaving(false)
      }
    }

    return (
      <div className="flex flex-col min-h-screen bg-(--color-background)">
        {/* Header */}
        <header className="bg-(--color-primary) px-4 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/vouchers')}
            className="text-white/85 hover:text-white p-1 rounded-md transition-colors"
            aria-label={tc('back')}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M14 5l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white leading-tight truncate">
              {currentList?.name ?? t('hub.title')}
            </h1>
            <p className="text-xs text-white/70 mt-0.5">
              {t('list.vouchers', { count: vouchersData.vouchers.length })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsEditMode((p) => !p)
              setSelectedIds(new Set())
            }}
            className="text-white/85 hover:text-white text-sm font-semibold px-3 py-1.5 rounded-md transition-colors"
          >
            {isEditMode ? t('hub.doneEditing') : t('hub.editMode')}
          </button>
        </header>

        {/* Edit mode toolbar */}
        {isEditMode && selectedIds.size > 0 && (
          <div className="bg-(--color-surface) border-b border-(--color-muted)/15 px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[#1a1a1a]">
              {t('editMode.selected', { count: selectedIds.size })}
            </span>
            <button
              type="button"
              onClick={() => void handleBulkDelete()}
              disabled={isSaving}
              className="text-sm font-semibold text-(--color-error) disabled:opacity-50"
            >
              {t('editMode.deleteSelected')}
            </button>
          </div>
        )}

        {/* Error banner */}
        {(pageError ?? vouchersData.error) && (
          <div className="bg-(--color-error)/10 border-b border-(--color-error)/20 px-4 py-2">
            <p className="text-xs text-(--color-error)">{pageError ?? vouchersData.error}</p>
          </div>
        )}

        {/* Voucher grid */}
        <main className="flex-1 px-4 py-4 pb-24">
          {vouchersData.isLoading ? (
            <div className="py-16 text-center text-sm text-(--color-muted)">{tc('loading')}</div>
          ) : vouchersData.vouchers.length === 0 ? (
            <div className="py-16 text-center">
              <span className="block text-3xl mb-3">🎟️</span>
              <p className="text-sm text-(--color-muted)">{t('list.emptyState')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {vouchersData.vouchers.map((voucher) => (
                <VoucherCard
                  key={voucher.id}
                  voucher={voucher}
                  isSelected={selectedIds.has(voucher.id)}
                  isEditMode={isEditMode}
                  onClick={(v) => {
                    if (!isEditMode) setSelectedVoucher(v)
                  }}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          )}
        </main>

        {/* FAB */}
        {!isEditMode && (
          <button
            type="button"
            onClick={() => {
              setSelectedVoucher(null)
              setShowCreateModal(true)
            }}
            aria-label={t('modal.createTitle')}
            className="fixed bottom-24 end-4 w-14 h-14 rounded-full bg-(--color-primary) text-white shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {/* Create voucher modal */}
        <VoucherModal
          isOpen={showCreateModal && !selectedVoucher}
          onClose={() => setShowCreateModal(false)}
          onSave={handleSaveVoucher}
          isLoading={isSaving}
        />

        {/* Edit voucher modal */}
        {selectedVoucher && (
          <VoucherModal
            isOpen={!!selectedVoucher}
            onClose={() => setSelectedVoucher(null)}
            onSave={handleSaveVoucher}
            onDelete={handleDeleteVoucher}
            voucher={selectedVoucher}
            isLoading={isSaving}
          />
        )}
      </div>
    )
  }

  // ─── Main hub grid (no listId) ────────────────────────────────────────────
  return (
    <VouchersHub
      voucherLists={hub.voucherLists}
      isLoading={hub.isLoading}
      mutations={hub}
    />
  )
}
