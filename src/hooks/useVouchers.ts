/**
 * useVouchers — Voucher CRUD and image upload for a single Vouchers Sub-Hub.
 *
 * Provides:
 *   - All vouchers for the given listId
 *   - CRUD operations: createVoucher, updateVoucher, deleteVoucher
 *   - Image upload to Supabase Storage (`{household_id}/vouchers/`)
 *   - OCR trigger via Tesseract.js (dynamic import, graceful fallback)
 *   - Realtime subscription on the vouchers table
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Voucher, VoucherInput } from '../types/vouchers'

export interface VouchersData {
  vouchers: Voucher[]
  isLoading: boolean
  error: string | null
}

export interface VouchersMutations {
  createVoucher: (input: VoucherInput) => Promise<Voucher>
  updateVoucher: (id: string, input: Partial<VoucherInput>) => Promise<void>
  deleteVoucher: (id: string) => Promise<void>
  uploadImage: (file: File, householdId: string) => Promise<string>
  runOcr: (imageUrl: string) => Promise<{ code: string | null; expiry: string | null }>
}

export function useVouchers(
  listId: string | null,
  householdId: string | null,
): VouchersData & VouchersMutations {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVouchers = useCallback(async () => {
    if (!listId) return
    setError(null)
    const { data, error: fetchErr } = await supabase
      .from('vouchers')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: false })
    if (fetchErr) {
      setError(fetchErr.message)
    } else {
      setVouchers((data as Voucher[]) ?? [])
    }
    setIsLoading(false)
  }, [listId])

  useEffect(() => {
    if (!listId) {
      setIsLoading(false)
      return
    }
    void fetchVouchers()

    const channel = supabase
      .channel(`vouchers:${listId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vouchers', filter: `list_id=eq.${listId}` },
        () => { void fetchVouchers() },
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [listId, fetchVouchers])

  const createVoucher = useCallback(
    async (input: VoucherInput): Promise<Voucher> => {
      if (!listId || !householdId) throw new Error('No list or household')
      const { data, error: err } = await supabase
        .from('vouchers')
        .insert({
          household_id: householdId,
          list_id: listId,
          name: input.name.trim(),
          value: input.value ?? null,
          issuer: input.issuer ?? null,
          expiry_date: input.expiry_date ?? null,
          code: input.code ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single()
      if (err || !data) throw new Error(err?.message ?? 'Failed to create voucher')
      const newVoucher = data as Voucher
      setVouchers((prev) => [newVoucher, ...prev])
      return newVoucher
    },
    [listId, householdId],
  )

  const updateVoucher = useCallback(async (id: string, input: Partial<VoucherInput>): Promise<void> => {
    const { error: err } = await supabase
      .from('vouchers')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) throw new Error(err.message)
    setVouchers((prev) => prev.map((v) => (v.id === id ? { ...v, ...input } : v)))
  }, [])

  const deleteVoucher = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('vouchers').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setVouchers((prev) => prev.filter((v) => v.id !== id))
  }, [])

  const uploadImage = useCallback(
    async (file: File, hid: string): Promise<string> => {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${hid}/vouchers/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('household-assets')
        .upload(path, file, { upsert: true })
      if (uploadErr) throw new Error(uploadErr.message)
      const { data } = supabase.storage.from('household-assets').getPublicUrl(path)
      return data.publicUrl
    },
    [],
  )

  /**
   * Runs Tesseract.js OCR on an image URL and extracts voucher code + expiry date.
   * Falls back gracefully if tesseract.js is unavailable or OCR fails.
   */
  const runOcr = useCallback(
    async (imageUrl: string): Promise<{ code: string | null; expiry: string | null }> => {
      try {
        const { createWorker } = await import('tesseract.js')
        const worker = await createWorker('eng')
        const { data } = await worker.recognize(imageUrl)
        await worker.terminate()

        const text = data.text

        // Extract code: look for alphanumeric sequences 8-20 chars
        const codeMatch = text.match(/\b([A-Z0-9]{8,20})\b/)
        const code = codeMatch?.[1] ?? null

        // Extract expiry: look for date patterns (DD/MM/YY, MM/DD/YYYY, etc.)
        const expiryMatch = text.match(
          /\b(?:exp(?:iry)?|valid\s+until|expires?)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/i,
        ) ?? text.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/)

        let expiry: string | null = null
        if (expiryMatch?.[1]) {
          // Normalise to YYYY-MM-DD
          const parts = expiryMatch[1].split(/[\/\-]/)
          if (parts.length === 3) {
            const [a, b, c] = parts
            // Guess format: if c is 4 digits it's the year
            if ((c ?? '').length === 4) {
              // Could be DD/MM/YYYY or MM/DD/YYYY — assume DD/MM/YYYY (Israeli)
              expiry = `${c}-${(b ?? '').padStart(2, '0')}-${(a ?? '').padStart(2, '0')}`
            } else if ((a ?? '').length === 4) {
              expiry = `${a}-${(b ?? '').padStart(2, '0')}-${(c ?? '').padStart(2, '0')}`
            }
          }
        }

        return { code, expiry }
      } catch {
        // OCR unavailable or failed — return null silently
        return { code: null, expiry: null }
      }
    },
    [],
  )

  return {
    vouchers,
    isLoading,
    error,
    createVoucher,
    updateVoucher,
    deleteVoucher,
    uploadImage,
    runOcr,
  }
}
