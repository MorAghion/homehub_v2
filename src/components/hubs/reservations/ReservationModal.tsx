/**
 * ReservationModal — create/edit modal for a single Reservation.
 *
 * Fields: restaurant_name, reservation_date, time, party_size, notes, image upload, booking URL
 * PRD §10.3
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BaseModal from '../../shared/BaseModal'
import type { Reservation, ReservationInput } from '../../../types/reservations'

interface ReservationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (input: ReservationInput & { smart_paste_url?: string }, imageFile?: File) => Promise<void>
  onDelete?: () => void
  reservation?: Reservation | null
  isLoading?: boolean
}

export default function ReservationModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  reservation,
  isLoading = false,
}: ReservationModalProps) {
  const { t } = useTranslation('reservations')
  const { t: tc } = useTranslation('common')

  const [name, setName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [time, setTime] = useState('')
  const [address, setAddress] = useState('')
  const [partySize, setPartySize] = useState('')
  const [notes, setNotes] = useState('')
  const [url, setUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setName(reservation?.name ?? '')
      setEventDate(reservation?.event_date ?? '')
      setTime(reservation?.time ?? '')
      setAddress(reservation?.address ?? '')
      setPartySize(reservation?.party_size?.toString() ?? '')
      setNotes(reservation?.notes ?? '')
      setUrl('')
      setImageFile(null)
      setImagePreview(reservation?.image_url ?? null)
      setShowDeleteConfirm(false)
      setError(null)
    }
  }, [isOpen, reservation])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSave(
        {
          name: name.trim(),
          event_date: eventDate || null,
          time: time.trim() || null,
          address: address.trim() || null,
          party_size: partySize ? parseInt(partySize, 10) : null,
          notes: notes.trim() || null,
          ...(url.trim() ? { smart_paste_url: url.trim() } : {}),
        },
        imageFile ?? undefined,
      )
    } catch {
      setError(tc('saveError'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    try {
      await onDelete()
    } catch {
      setError(tc('deleteError'))
    }
  }

  const isEdit = !!reservation

  if (showDeleteConfirm) {
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={() => setShowDeleteConfirm(false)}
        title={t('modal.deleteConfirm')}
        footer={
          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2.5 rounded-md border border-(--color-muted)/30 text-sm font-semibold text-(--color-muted)"
            >
              {tc('cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="flex-1 py-2.5 rounded-md bg-(--color-error) text-white text-sm font-semibold"
            >
              {tc('delete')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-(--color-muted)">{t('modal.deleteMessage')}</p>
      </BaseModal>
    )
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('modal.editTitle') : t('modal.createTitle')}
      footer={
        <div className="flex flex-col gap-2 w-full">
          {error && <p className="text-xs text-(--color-error)">{error}</p>}
          <div className="flex gap-2 w-full">
            {isEdit && onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="py-2.5 px-3 rounded-md border border-(--color-error)/30 text-sm font-semibold text-(--color-error)"
              >
                {tc('delete')}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-md border border-(--color-muted)/30 text-sm font-semibold text-(--color-muted)"
            >
              {tc('cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || isLoading || !name.trim()}
              className="flex-1 py-2.5 rounded-md bg-(--color-primary) text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving || isLoading ? tc('loading') : isEdit ? t('modal.saveEdit') : t('modal.saveCreate')}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Restaurant / Venue name */}
        <div>
          <label className="block text-xs font-medium text-(--color-muted) mb-1.5">
            {t('modal.nameLabel')} *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('modal.namePlaceholder')}
            maxLength={200}
            autoFocus
            className="w-full rounded-md px-3 py-2.5 text-sm bg-(--color-background) border border-(--color-muted)/20 focus:outline-none focus:border-(--color-primary) focus:ring-1 focus:ring-(--color-primary)/20 transition-colors"
          />
        </div>

        {/* Date + Time row */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-(--color-muted) mb-1.5">
              {t('modal.dateLabel')}
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-md px-3 py-2.5 text-sm bg-(--color-background) border border-(--color-muted)/20 focus:outline-none focus:border-(--color-primary) focus:ring-1 focus:ring-(--color-primary)/20 transition-colors"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-(--color-muted) mb-1.5">
              {t('modal.timeLabel')}
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-md px-3 py-2.5 text-sm bg-(--color-background) border border-(--color-muted)/20 focus:outline-none focus:border-(--color-primary) focus:ring-1 focus:ring-(--color-primary)/20 transition-colors"
            />
          </div>
        </div>

        {/* Party size */}
        <div>
          <label className="block text-xs font-medium text-(--color-muted) mb-1.5">
            {t('modal.partySizeLabel')}
          </label>
          <input
            type="number"
            value={partySize}
            onChange={(e) => setPartySize(e.target.value)}
            placeholder={t('modal.partySizePlaceholder')}
            min={1}
            max={100}
            className="w-full rounded-md px-3 py-2.5 text-sm bg-(--color-background) border border-(--color-muted)/20 focus:outline-none focus:border-(--color-primary) focus:ring-1 focus:ring-(--color-primary)/20 transition-colors"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-medium text-(--color-muted) mb-1.5">
            {t('modal.addressLabel')}
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t('modal.addressPlaceholder')}
            maxLength={300}
            className="w-full rounded-md px-3 py-2.5 text-sm bg-(--color-background) border border-(--color-muted)/20 focus:outline-none focus:border-(--color-primary) focus:ring-1 focus:ring-(--color-primary)/20 transition-colors"
          />
        </div>

        {/* Booking URL */}
        <div>
          <label className="block text-xs font-medium text-(--color-muted) mb-1.5">
            {t('modal.urlLabel')}
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('modal.urlPlaceholder')}
            className="w-full rounded-md px-3 py-2.5 text-sm bg-(--color-background) border border-(--color-muted)/20 focus:outline-none focus:border-(--color-primary) focus:ring-1 focus:ring-(--color-primary)/20 transition-colors"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-(--color-muted) mb-1.5">
            {t('modal.notesLabel')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('modal.notesPlaceholder')}
            rows={2}
            maxLength={1000}
            className="w-full rounded-md px-3 py-2.5 text-sm bg-(--color-background) border border-(--color-muted)/20 focus:outline-none focus:border-(--color-primary) focus:ring-1 focus:ring-(--color-primary)/20 transition-colors resize-none"
          />
        </div>

        {/* Image upload */}
        <div>
          <label className="block text-xs font-medium text-(--color-muted) mb-1.5">
            {t('modal.imageLabel')}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            aria-label={t('modal.imageUpload')}
          />
          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt={t('modal.imageLabel')}
                className="w-full max-h-40 object-contain rounded-md border border-(--color-muted)/20"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-2 end-2 bg-(--color-surface)/90 text-xs px-2 py-1 rounded-md border border-(--color-muted)/20 text-(--color-muted) hover:text-[#1a1a1a]"
              >
                {t('modal.imageUpload')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 rounded-md border border-dashed border-(--color-muted)/30 text-sm text-(--color-muted) hover:border-(--color-primary) hover:text-(--color-primary) transition-colors flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {t('modal.imageUpload')}
            </button>
          )}
        </div>
      </div>
    </BaseModal>
  )
}
