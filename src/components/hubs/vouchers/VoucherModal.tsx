/**
 * VoucherModal — create/edit modal for a single Voucher.
 *
 * Fields: name, code, expiry_date, value, notes, image upload
 * Features: OCR on image upload, Smart Paste for BuyMe URLs
 * PRD §9.3
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BaseModal from '../../shared/BaseModal'
import type { Voucher, VoucherInput } from '../../../types/vouchers'

interface VoucherModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (input: VoucherInput, imageFile?: File) => Promise<void>
  onDelete?: () => void
  voucher?: Voucher | null
  isLoading?: boolean
}

/** Detect a BuyMe URL and extract basic info. */
function parseBuyMeUrl(url: string): Partial<VoucherInput> | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('buyme.co.il') || parsed.hostname.includes('buyme.com')) {
      // Extract voucher code from path e.g. /gift/<code> or query param
      const pathParts = parsed.pathname.split('/').filter(Boolean)
      const code = parsed.searchParams.get('code') ?? pathParts[pathParts.length - 1] ?? null
      return { issuer: 'BuyMe', ...(code ? { code } : {}) }
    }
  } catch {
    // Not a valid URL
  }
  return null
}

export default function VoucherModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  voucher,
  isLoading = false,
}: VoucherModalProps) {
  const { t } = useTranslation('vouchers')
  const { t: tc } = useTranslation('common')

  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [code, setCode] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isOcrRunning, setIsOcrRunning] = useState(false)
  const [ocrFound, setOcrFound] = useState(false)
  const [smartPasteDetected, setSmartPasteDetected] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Populate form from existing voucher on open
  useEffect(() => {
    if (isOpen) {
      setName(voucher?.name ?? '')
      setValue(voucher?.value ?? '')
      setCode(voucher?.code ?? '')
      setExpiryDate(voucher?.expiry_date ?? '')
      setNotes(voucher?.notes ?? '')
      setImageFile(null)
      setImagePreview(voucher?.image_url ?? null)
      setIsOcrRunning(false)
      setOcrFound(false)
      setSmartPasteDetected(false)
      setShowDeleteConfirm(false)
      setError(null)
    }
  }, [isOpen, voucher])

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const url = URL.createObjectURL(file)
    setImagePreview(url)

    // Run OCR
    setIsOcrRunning(true)
    setOcrFound(false)
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('eng')
      const { data } = await worker.recognize(url)
      await worker.terminate()

      const text = data.text
      const codeMatch = text.match(/\b([A-Z0-9]{8,20})\b/)
      const expiryMatch =
        text.match(/(?:exp(?:iry)?|valid\s+until|expires?)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i) ??
        text.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/)

      let filled = false
      if (codeMatch?.[1] && !code) {
        setCode(codeMatch[1])
        filled = true
      }
      if (expiryMatch?.[1] && !expiryDate) {
        const parts = expiryMatch[1].split(/[\/\-]/)
        if (parts.length === 3) {
          const [a, b, c] = parts
          let iso = ''
          if ((c ?? '').length === 4) {
            iso = `${c}-${(b ?? '').padStart(2, '0')}-${(a ?? '').padStart(2, '0')}`
          } else if ((a ?? '').length === 4) {
            iso = `${a}-${(b ?? '').padStart(2, '0')}-${(c ?? '').padStart(2, '0')}`
          }
          if (iso) {
            setExpiryDate(iso)
            filled = true
          }
        }
      }
      if (filled) setOcrFound(true)
    } catch {
      // OCR unavailable — silently ignore
    } finally {
      setIsOcrRunning(false)
    }
  }

  function handleCodePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text')
    const buyMe = parseBuyMeUrl(pasted)
    if (buyMe) {
      e.preventDefault()
      if (buyMe.issuer && !name) setName(buyMe.issuer)
      if (buyMe.code) setCode(buyMe.code)
      setSmartPasteDetected(true)
    }
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSave(
        {
          name: name.trim(),
          value: value.trim() || null,
          issuer: null,
          expiry_date: expiryDate || null,
          code: code.trim() || null,
          notes: notes.trim() || null,
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

  const isEdit = !!voucher

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
        {/* Name */}
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

        {/* Value */}
        <div>
          <label className="block text-xs font-medium text-(--color-muted) mb-1.5">
            {t('modal.valueLabel')}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('modal.valuePlaceholder')}
            maxLength={50}
            className="w-full rounded-md px-3 py-2.5 text-sm bg-(--color-background) border border-(--color-muted)/20 focus:outline-none focus:border-(--color-primary) focus:ring-1 focus:ring-(--color-primary)/20 transition-colors"
          />
        </div>

        {/* Code — with Smart Paste */}
        <div>
          <label className="block text-xs font-medium text-(--color-muted) mb-1.5">
            {t('modal.codeLabel')}
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onPaste={handleCodePaste}
            placeholder={t('modal.codePlaceholder')}
            maxLength={200}
            className="w-full rounded-md px-3 py-2.5 text-sm bg-(--color-background) border border-(--color-muted)/20 focus:outline-none focus:border-(--color-primary) focus:ring-1 focus:ring-(--color-primary)/20 transition-colors font-mono"
          />
          {smartPasteDetected && (
            <p className="text-xs text-(--color-success) mt-1">{t('modal.smartPasteDetected')}</p>
          )}
        </div>

        {/* Expiry date */}
        <div>
          <label className="block text-xs font-medium text-(--color-muted) mb-1.5">
            {t('modal.expiryLabel')}
          </label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
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
            onChange={(e) => void handleImageChange(e)}
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
          {isOcrRunning && (
            <p className="text-xs text-(--color-muted) mt-1 animate-pulse">{t('modal.ocrRunning')}</p>
          )}
          {ocrFound && !isOcrRunning && (
            <p className="text-xs text-(--color-success) mt-1">{t('modal.ocrFound')}</p>
          )}
        </div>
      </div>
    </BaseModal>
  )
}
