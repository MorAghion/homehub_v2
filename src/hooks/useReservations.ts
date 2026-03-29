/**
 * useReservations — Reservation CRUD + image upload for a specific Sub-Hub.
 *
 * Manages reservations belonging to a given sub_hub_id.
 * Images are uploaded to Supabase Storage at `{household_id}/reservations/{filename}`.
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Reservation, ReservationFormData } from '../types/reservations'
import { sortReservations } from '../lib/reservations'
import { useSession } from '../contexts/AuthContext'

export interface ReservationsData {
  reservations: Reservation[]
  isLoading: boolean
  error: string | null
}

export interface ReservationsMutations {
  createReservation: (data: ReservationFormData) => Promise<Reservation>
  updateReservation: (id: string, data: Partial<ReservationFormData>) => Promise<void>
  deleteReservation: (id: string) => Promise<void>
  deleteReservations: (ids: string[]) => Promise<void>
  uploadImage: (file: File) => Promise<string>
}

export function useReservations(subHubId: string | null): ReservationsData & ReservationsMutations {
  const { household } = useSession()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ─── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!household || !subHubId) {
      setReservations([])
      setIsLoading(false)
      return
    }
    try {
      setError(null)
      const { data, error: qErr } = await supabase
        .from('reservations')
        .select('*')
        .eq('sub_hub_id', subHubId)
        .eq('household_id', household.id)
      if (qErr) throw qErr
      // Sort: upcoming first (asc), past last (desc)
      const sorted = sortReservations((data ?? []) as Reservation[])
      setReservations(sorted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reservations')
    } finally {
      setIsLoading(false)
    }
  }, [household, subHubId])

  useEffect(() => {
    setIsLoading(true)
    void load()
  }, [load])

  // ─── Realtime ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!household || !subHubId) return

    const channel = supabase
      .channel(`sub-hub:${subHubId}:reservations`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
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
      const path = `${household.id}/reservations/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('household-uploads')
        .upload(path, file, { upsert: false })
      if (upErr) throw upErr
      const { data: signed, error: signErr } = await supabase.storage
        .from('household-uploads')
        .createSignedUrl(path, 3600)
      if (signErr) throw signErr
      return signed.signedUrl
    },
    [household],
  )

  const createReservation = useCallback(
    async (data: ReservationFormData): Promise<Reservation> => {
      if (!household || !subHubId) throw new Error('No household or sub-hub')

      let imageUrl: string | null = null
      if (data.image_file) {
        imageUrl = await uploadImage(data.image_file)
      }

      const { data: row, error: iErr } = await supabase
        .from('reservations')
        .insert({
          sub_hub_id: subHubId,
          household_id: household.id,
          restaurant_name: data.restaurant_name.trim(),
          reservation_date: data.reservation_date || null,
          party_size: data.party_size ?? null,
          notes: data.notes?.trim() || null,
          image_url: imageUrl,
          smart_paste_url: data.smart_paste_url?.trim() || null,
        })
        .select()
        .single()
      if (iErr) throw iErr
      return row as Reservation
    },
    [household, subHubId, uploadImage],
  )

  const updateReservation = useCallback(
    async (id: string, data: Partial<ReservationFormData>): Promise<void> => {
      const updates: Record<string, unknown> = {}
      if (data.restaurant_name !== undefined)
        updates['restaurant_name'] = data.restaurant_name.trim()
      if (data.reservation_date !== undefined)
        updates['reservation_date'] = data.reservation_date || null
      if (data.party_size !== undefined) updates['party_size'] = data.party_size ?? null
      if (data.notes !== undefined) updates['notes'] = data.notes?.trim() || null
      if (data.smart_paste_url !== undefined)
        updates['smart_paste_url'] = data.smart_paste_url?.trim() || null

      if (data.image_file) {
        updates['image_url'] = await uploadImage(data.image_file)
      }

      const { error: uErr } = await supabase.from('reservations').update(updates).eq('id', id)
      if (uErr) throw uErr
    },
    [uploadImage],
  )

  const deleteReservation = useCallback(async (id: string): Promise<void> => {
    const { error: dErr } = await supabase.from('reservations').delete().eq('id', id)
    if (dErr) throw dErr
  }, [])

  const deleteReservations = useCallback(async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return
    const { error: dErr } = await supabase.from('reservations').delete().in('id', ids)
    if (dErr) throw dErr
  }, [])

  return {
    reservations,
    isLoading,
    error,
    createReservation,
    updateReservation,
    deleteReservation,
    deleteReservations,
    uploadImage,
  }
}
