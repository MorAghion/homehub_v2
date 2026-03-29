/**
 * useVouchers — Voucher CRUD + image upload for a specific Sub-Hub.
 *
 * Manages vouchers belonging to a given sub_hub_id.
 * Images are uploaded to Supabase Storage at `{household_id}/vouchers/{filename}`.
 * Realtime is handled at the parent (useVouchersHub) level — this hook re-fetches
 * when the parent triggers a refetch.
 *
 * OCR: image upload returns the signed URL. Callers pass OCR text via
 * extractVoucherDataFromText() (from lib/vouchers) once Tesseract.js
 * has processed the image client-side.
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Voucher, VoucherFormData } from '../types/vouchers'
import { useSession } from '../contexts/AuthContext'

export interface VouchersData {
  vouchers: Voucher[]
  isLoading: boolean
  error: string | null
}

export interface VouchersMutations {
  createVoucher: (data: VoucherFormData) => Promise<Voucher>
  updateVoucher: (id: string, data: Partial<VoucherFormData>) => Promise<void>
  deleteVoucher: (id: string) => Promise<void>
  deleteVouchers: (ids: string[]) => Promise<void>
  /** Uploads an image file and returns a signed URL (1 hr expiry). */
  uploadImage: (file: File) => Promise<string>
}

export function useVouchers(subHubId: string | null): VouchersData & VouchersMutations {
  const { household } = useSession()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ─── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!household || !subHubId) {
      setVouchers([])
      setIsLoading(false)
      return
    }
    try {
      setError(null)
      const { data, error: qErr } = await supabase
        .from('vouchers')
        .select('*')
        .eq('sub_hub_id', subHubId)
        .eq('household_id', household.id)
        .order('created_at', { ascending: false })
      if (qErr) throw qErr
      setVouchers((data ?? []) as Voucher[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vouchers')
    } finally {
      setIsLoading(false)
    }
  }, [household, subHubId])

  useEffect(() => {
    setIsLoading(true)
    void load()
  }, [load])

  // ─── Realtime ──────────────────────────────────────────────────────────────
  // Subscribe to parent sub_hub changes (household-scoped) — re-fetch on event.
  // Per CLAUDE.md §4.9: subscribe to parent table, not child table with household_id.

  useEffect(() => {
    if (!household || !subHubId) return

    const channel = supabase
      .channel(`sub-hub:${subHubId}:vouchers`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vouchers',
          filter: `sub_hub_id=eq.${subHubId}`,
        },
        () => void load(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [household, subHubId, load])

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const uploadImage = useCallback(
    async (file: File): Promise<string> => {
      if (!household) throw new Error('No household')
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${household.id}/vouchers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('household-uploads')
        .upload(path, file, { upsert: false })
      if (upErr) throw upErr
      // Return signed URL (1 hour expiry — per CLAUDE.md §4.6)
      const { data: signed, error: signErr } = await supabase.storage
        .from('household-uploads')
        .createSignedUrl(path, 3600)
      if (signErr) throw signErr
      return signed.signedUrl
    },
    [household],
  )

  const createVoucher = useCallback(
    async (data: VoucherFormData): Promise<Voucher> => {
      if (!household || !subHubId) throw new Error('No household or sub-hub')

      let imageUrl: string | null = null
      if (data.image_file) {
        imageUrl = await uploadImage(data.image_file)
      }

      const { data: row, error: iErr } = await supabase
        .from('vouchers')
        .insert({
          sub_hub_id: subHubId,
          household_id: household.id,
          name: data.name.trim(),
          code: data.code?.trim() || null,
          expiry_date: data.expiry_date || null,
          value: data.value?.trim() || null,
          notes: data.notes?.trim() || null,
          image_url: imageUrl,
        })
        .select()
        .single()
      if (iErr) throw iErr
      return row as Voucher
    },
    [household, subHubId, uploadImage],
  )

  const updateVoucher = useCallback(
    async (id: string, data: Partial<VoucherFormData>): Promise<void> => {
      const updates: Record<string, unknown> = {}
      if (data.name !== undefined) updates['name'] = data.name.trim()
      if (data.code !== undefined) updates['code'] = data.code?.trim() || null
      if (data.expiry_date !== undefined) updates['expiry_date'] = data.expiry_date || null
      if (data.value !== undefined) updates['value'] = data.value?.trim() || null
      if (data.notes !== undefined) updates['notes'] = data.notes?.trim() || null

      if (data.image_file) {
        updates['image_url'] = await uploadImage(data.image_file)
      }

      const { error: uErr } = await supabase.from('vouchers').update(updates).eq('id', id)
      if (uErr) throw uErr
    },
    [uploadImage],
  )

  const deleteVoucher = useCallback(async (id: string): Promise<void> => {
    const { error: dErr } = await supabase.from('vouchers').delete().eq('id', id)
    if (dErr) throw dErr
  }, [])

  const deleteVouchers = useCallback(async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return
    const { error: dErr } = await supabase.from('vouchers').delete().in('id', ids)
    if (dErr) throw dErr
  }, [])

  return {
    vouchers,
    isLoading,
    error,
    createVoucher,
    updateVoucher,
    deleteVoucher,
    deleteVouchers,
    uploadImage,
  }
}
