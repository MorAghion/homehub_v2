/**
 * ReservationModal — create / edit modal for a single reservation.
 *
 * Fields: restaurant_name, reservation_date (date picker), party_size,
 *         notes, image upload, smart_paste_url.
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BaseModal from '../../shared/BaseModal'
import type { Reservation, ReservationFormData } from '../../../types/reservations'
import { validateReservation } from '../../../lib/reservations'

interface ReservationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ReservationFormData) => Promise<void>
  onDelete?: () => void
  initial?: Reservation | null
}

const EMPTY_FORM: ReservationFormData = {
  restaurant_name: '',
  reservation_date: null,
  party_size: null,
  notes: '',
  smart_paste_url: '',
  image_file: null,
}

export default function ReservationModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initial,
}: ReservationModalProps) {
  const { t } = useTranslation(['reservations', 'common'])
  const isEditMode = !!initial
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<ReservationFormData>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [partySizeStr, setPartySizeStr] = useState('')

  useEffect(() => {
    if (isOpen) {
      const f: ReservationFormData = initial
        ? {
            restaurant_name: initial.restaurant_name,
            reservation_date: initial.reservation_date,
            party_size: initial.party_size,
            notes: initial.notes ?? '',
            smart_paste_url: initial.smart_paste_url ?? '',
            image_file: null,
          }
        : EMPTY_FORM
      setForm(f)
      setPartySizeStr(initial?.party_size != null ? String(initial.party_size) : '')
      setPreviewUrl(initial?.image_url ?? null)
      setSaveError(null)
    }
  }, [isOpen, initial])

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function setField<K extends keyof ReservationFormData>(key: K, value: ReservationFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handlePartySizeChange(value: string) {
    setPartySizeStr(value)
    const num = parseInt(value, 10)
    setField('party_size', isNaN(num) ? null : num)
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
    setField('image_file', file)
  }

  async function handleSubmit() {
    const validation = validateReservation(form)
    if (!validation.valid) {
      setSaveError(t('common:saveError'))
      return
    }
    try {
      setIsSaving(true)
      setSaveError(null)
      await onSave(form)
      onClose()
    } catch {
      setSaveError(t('common:saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  const title = isEditMode
    ? t('reservations:editReservation')
    : t('reservations:addReservation')

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex items-center gap-3 w-full">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-4 py-2.5 h-11 rounded-md text-sm font-semibold text-[--color-error] border border-[--color-error] hover:bg-[--color-error]/5 transition-colors"
            >
              {t('common:delete')}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 h-11 rounded-md text-base font-semibold text-[--color-primary] border border-[--color-primary] bg-[--color-surface]"
          >
            {t('common:cancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving}
            className="flex-1 h-11 rounded-md text-base font-semibold text-white bg-[--color-primary] disabled:opacity-50 transition-opacity"
          >
            {isSaving ? t('common:loading') : t('common:save')}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {saveError && (
          <p role="alert" className="text-sm text-[--color-error]">
            {saveError}
          </p>
        )}

        {/* Name */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[#1a1a1a]">
            {t('reservations:fields.name')}
          </span>
          <input
            type="text"
            value={form.restaurant_name}
            onChange={(e) => setField('restaurant_name', e.target.value)}
            placeholder={t('reservations:fields.namePlaceholder')}
            maxLength={100}
            className="h-11 rounded-md border border-[--color-muted]/40 bg-[--color-surface] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
          />
        </label>

        {/* Date + Party size (two columns) */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[#1a1a1a]">
              {t('reservations:fields.date')}
            </span>
            <input
              type="date"
              value={form.reservation_date ?? ''}
              onChange={(e) => setField('reservation_date', e.target.value || null)}
              className="h-11 rounded-md border border-[--color-muted]/40 bg-[--color-surface] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[#1a1a1a]">
              {t('reservations:fields.partySize')}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              value={partySizeStr}
              onChange={(e) => handlePartySizeChange(e.target.value)}
              placeholder={t('reservations:fields.partySizePlaceholder')}
              className="h-11 rounded-md border border-[--color-muted]/40 bg-[--color-surface] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
            />
          </label>
        </div>

        {/* Notes */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[#1a1a1a]">
            {t('reservations:fields.notes')}
          </span>
          <textarea
            value={form.notes ?? ''}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder={t('reservations:fields.notesPlaceholder')}
            rows={2}
            maxLength={500}
            className="rounded-md border border-[--color-muted]/40 bg-[--color-surface] px-3 py-2 text-base resize-none focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
          />
        </label>

        {/* Booking URL */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[#1a1a1a]">
            {t('reservations:fields.smartPasteUrl')}
          </span>
          <input
            type="url"
            value={form.smart_paste_url ?? ''}
            onChange={(e) => setField('smart_paste_url', e.target.value)}
            placeholder={t('reservations:fields.smartPasteUrlPlaceholder')}
            className="h-11 rounded-md border border-[--color-muted]/40 bg-[--color-surface] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
          />
        </label>

        {/* Image upload */}
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[#1a1a1a]">
            {t('reservations:fields.image')}
          </span>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Reservation"
              className="w-full h-32 object-cover rounded-md mb-1"
            />
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-11 rounded-md border border-dashed border-[--color-muted]/60 bg-[--color-surface] text-sm text-[--color-muted] hover:border-[--color-primary] hover:text-[--color-primary] transition-colors"
          >
            {previewUrl ? '↑ Replace image' : '↑ Upload image'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleImageChange}
          />
        </div>
      </div>
    </BaseModal>
  )
}
