/**
 * useReservations — Reservation CRUD and image upload for a single Reservations Sub-Hub.
 *
 * Provides:
 *   - All reservations for the given listId
 *   - CRUD operations: createReservation, updateReservation, deleteReservation
 *   - Image upload to Supabase Storage (`{household_id}/reservations/`)
 *   - Realtime subscription on the reservations table
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Reservation, ReservationInput } from '../types/reservations'

export interface ReservationsData {
  reservations: Reservation[]
  isLoading: boolean
  error: string | null
}

export interface ReservationsMutations {
  createReservation: (input: ReservationInput) => Promise<Reservation>
  updateReservation: (id: string, input: Partial<ReservationInput>) => Promise<void>
  deleteReservation: (id: string) => Promise<void>
  uploadImage: (file: File, householdId: string) => Promise<string>
}

export function useReservations(
  listId: string | null,
  householdId: string | null,
): ReservationsData & ReservationsMutations {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReservations = useCallback(async () => {
    if (!listId) return
    setError(null)
    const { data, error: fetchErr } = await supabase
      .from('reservations')
      .select('*')
      .eq('list_id', listId)
      .order('event_date', { ascending: true })
    if (fetchErr) {
      setError(fetchErr.message)
    } else {
      setReservations((data as Reservation[]) ?? [])
    }
    setIsLoading(false)
  }, [listId])

  useEffect(() => {
    if (!listId) {
      setIsLoading(false)
      return
    }
    void fetchReservations()

    const channel = supabase
      .channel(`reservations:${listId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations', filter: `list_id=eq.${listId}` },
        () => { void fetchReservations() },
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [listId, fetchReservations])

  const createReservation = useCallback(
    async (input: ReservationInput): Promise<Reservation> => {
      if (!listId || !householdId) throw new Error('No list or household')
      const { data, error: err } = await supabase
        .from('reservations')
        .insert({
          household_id: householdId,
          list_id: listId,
          name: input.name.trim(),
          event_date: input.event_date ?? null,
          time: input.time ?? null,
          address: input.address ?? null,
          party_size: input.party_size ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single()
      if (err || !data) throw new Error(err?.message ?? 'Failed to create reservation')
      const newReservation = data as Reservation
      setReservations((prev) =>
        [newReservation, ...prev].sort((a, b) =>
          (a.event_date ?? '') < (b.event_date ?? '') ? -1 : 1,
        ),
      )
      return newReservation
    },
    [listId, householdId],
  )

  const updateReservation = useCallback(
    async (id: string, input: Partial<ReservationInput>): Promise<void> => {
      const { error: err } = await supabase
        .from('reservations')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (err) throw new Error(err.message)
      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, ...input } : r)))
    },
    [],
  )

  const deleteReservation = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('reservations').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setReservations((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const uploadImage = useCallback(
    async (file: File, hid: string): Promise<string> => {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${hid}/reservations/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('household-assets')
        .upload(path, file, { upsert: true })
      if (uploadErr) throw new Error(uploadErr.message)
      const { data } = supabase.storage.from('household-assets').getPublicUrl(path)
      return data.publicUrl
    },
    [],
  )

  return {
    reservations,
    isLoading,
    error,
    createReservation,
    updateReservation,
    deleteReservation,
    uploadImage,
  }
}
