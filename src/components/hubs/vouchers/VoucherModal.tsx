/**
 * VoucherModal — create / edit modal for a single voucher.
 *
 * Fields: name, code, expiry_date, value, notes, image upload.
 * Smart Paste: detects BuyMe URLs pasted into the code field.
 * OCR: when an image is uploaded, OCR text extraction is triggered
 *       (integration point for Tesseract.js — see inline comment).
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BaseModal from '../../shared/BaseModal'
import type { Voucher, VoucherFormData } from '../../../types/vouchers'
import {
  isBuyMeUrl,
  parseBuyMeUrl,
  extractVoucherDataFromText,
  validateVoucher,
} from '../../../lib/vouchers'

interface VoucherModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: VoucherFormData) => Promise<void>
  onDelete?: () => void
  initial?: Voucher | null   // null / undefined = create mode
}

const EMPTY_FORM: VoucherFormData = {
  name: '',
  code: '',
  expiry_date: null,
  value: '',
  notes: '',
  image_file: null,
}

export default function VoucherModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initial,
}: VoucherModalProps) {
  const { t } = useTranslation(['vouchers', 'common'])
  const isEditMode = !!initial
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<VoucherFormData>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [smartPasteMsg, setSmartPasteMsg] = useState<string | null>(null)
  const [ocrMsg, setOcrMsg] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm(
        initial
          ? {
              name: initial.name,
              code: initial.code ?? '',
              expiry_date: initial.expiry_date,
              value: initial.value ?? '',
              notes: initial.notes ?? '',
              image_file: null,
            }
          : EMPTY_FORM,
      )
      setPreviewUrl(initial?.image_url ?? null)
      setSaveError(null)
      setSmartPasteMsg(null)
      setOcrMsg(null)
    }
  }, [isOpen, initial])

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function setField<K extends keyof VoucherFormData>(key: K, value: VoucherFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // ─── Smart Paste (BuyMe) ──────────────────────────────────────────────────

  function handleCodeChange(value: string) {
    setField('code', value)
    setSmartPasteMsg(null)

    if (isBuyMeUrl(value)) {
      const parsed = parseBuyMeUrl(value)
      if (parsed.code) {
        setField('code', parsed.code)
        setSmartPasteMsg(t('vouchers:smartPaste.detected'))
      } else {
        setSmartPasteMsg(t('vouchers:smartPaste.failed'))
      }
    }
  }

  // ─── Image upload + OCR ───────────────────────────────────────────────────

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Show local preview
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
    setField('image_file', file)
    setOcrMsg(t('vouchers:ocr.scanning'))

    // OCR integration point:
    // If Tesseract.js is available (import Tesseract from 'tesseract.js'),
    // call: const { data: { text } } = await Tesseract.recognize(file, 'eng')
    // Then: const extracted = extractVoucherDataFromText(text)
    // For now: read file as text as a stub (won't extract real data from images)
    try {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const rawText = typeof ev.target?.result === 'string' ? ev.target.result : ''
        const extracted = extractVoucherDataFromText(rawText)
        let found = false
        if (extracted.code && !form.code) {
          setField('code', extracted.code)
          found = true
        }
        if (extracted.expiry_date && !form.expiry_date) {
          setField('expiry_date', extracted.expiry_date)
          found = true
        }
        if (extracted.value && !form.value) {
          setField('value', extracted.value)
          found = true
        }
        setOcrMsg(found ? t('vouchers:ocr.found') : t('vouchers:ocr.notFound'))
      }
      // Read as text only for stub — real OCR would use Tesseract
      reader.readAsText(file)
    } catch {
      setOcrMsg(t('vouchers:ocr.notFound'))
    }
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    const validation = validateVoucher(form)
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

  const title = isEditMode ? t('vouchers:editVoucher') : t('vouchers:addVoucher')

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
            className="px-4 py-2.5 h-11 rounded-md text-base font-semibold text-[--color-primary] border border-[--color-primary] bg-[--color-surface] hover:bg-[--color-primary]/5 transition-colors"
          >
            {t('common:cancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving}
            className="flex-1 h-11 rounded-md text-base font-semibold text-white bg-[--color-primary] hover:opacity-90 disabled:opacity-50 transition-opacity"
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
            {t('vouchers:fields.name')}
          </span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder={t('vouchers:fields.namePlaceholder')}
            maxLength={100}
            className="h-11 rounded-md border border-[--color-muted]/40 bg-[--color-surface] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
          />
        </label>

        {/* Code */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[#1a1a1a]">
            {t('vouchers:fields.code')}
          </span>
          <input
            type="text"
            value={form.code ?? ''}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder={t('vouchers:fields.codePlaceholder')}
            maxLength={200}
            className="h-11 rounded-md border border-[--color-muted]/40 bg-[--color-surface] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
          />
          {smartPasteMsg && (
            <p className="text-xs text-[--color-muted] mt-0.5">{smartPasteMsg}</p>
          )}
        </label>

        {/* Value + Expiry (two columns) */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[#1a1a1a]">
              {t('vouchers:fields.value')}
            </span>
            <input
              type="text"
              value={form.value ?? ''}
              onChange={(e) => setField('value', e.target.value)}
              placeholder={t('vouchers:fields.valuePlaceholder')}
              maxLength={50}
              className="h-11 rounded-md border border-[--color-muted]/40 bg-[--color-surface] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[#1a1a1a]">
              {t('vouchers:fields.expiryDate')}
            </span>
            <input
              type="date"
              value={form.expiry_date ?? ''}
              onChange={(e) => setField('expiry_date', e.target.value || null)}
              className="h-11 rounded-md border border-[--color-muted]/40 bg-[--color-surface] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
            />
          </label>
        </div>

        {/* Notes */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[#1a1a1a]">
            {t('vouchers:fields.notes')}
          </span>
          <textarea
            value={form.notes ?? ''}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder={t('vouchers:fields.notesPlaceholder')}
            rows={2}
            className="rounded-md border border-[--color-muted]/40 bg-[--color-surface] px-3 py-2 text-base resize-none focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
          />
        </label>

        {/* Image upload */}
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[#1a1a1a]">
            {t('vouchers:fields.image')}
          </span>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Voucher"
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
            onChange={(e) => void handleImageChange(e)}
          />
          {ocrMsg && (
            <p className="text-xs text-[--color-muted] mt-0.5">{ocrMsg}</p>
          )}
        </div>
      </div>
    </BaseModal>
  )
}
