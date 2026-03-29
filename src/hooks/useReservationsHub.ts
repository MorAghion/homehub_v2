/**
 * useReservationsHub — Sub-Hub CRUD and Supabase Realtime for the Reservations Hub.
 *
 * Provides:
 *   - All reservation sub-hubs (lists) for the current household
 *   - CRUD operations for sub-hubs
 *   - Realtime subscription on the reservation_lists table
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ReservationList } from '../types/reservations'

export interface ReservationsHubData {
  reservationLists: ReservationList[]
  isLoading: boolean
  error: string | null
}

export interface ReservationsHubMutations {
  createList: (name: string) => Promise<ReservationList>
  updateList: (id: string, name: string) => Promise<void>
  deleteList: (id: string) => Promise<void>
}

export function useReservationsHub(
  householdId: string | null,
): ReservationsHubData & ReservationsHubMutations {
  const [reservationLists, setReservationLists] = useState<ReservationList[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!householdId) return
    setError(null)
    const { data, error: fetchErr } = await supabase
      .from('reservation_lists')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true })
    if (fetchErr) {
      setError(fetchErr.message)
    } else {
      setReservationLists((data as ReservationList[]) ?? [])
    }
    setIsLoading(false)
  }, [householdId])

  useEffect(() => {
    if (!householdId) {
      setIsLoading(false)
      return
    }
    void fetchAll()

    const channel = supabase
      .channel(`reservation_lists:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservation_lists',
          filter: `household_id=eq.${householdId}`,
        },
        () => { void fetchAll() },
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [householdId, fetchAll])

  const createList = useCallback(
    async (name: string): Promise<ReservationList> => {
      if (!householdId) throw new Error('No household')
      const { data, error: err } = await supabase
        .from('reservation_lists')
        .insert({ household_id: householdId, name: name.trim() })
        .select()
        .single()
      if (err || !data) throw new Error(err?.message ?? 'Failed to create list')
      const newList = data as ReservationList
      setReservationLists((prev) => [...prev, newList])
      return newList
    },
    [householdId],
  )

  const updateList = useCallback(async (id: string, name: string): Promise<void> => {
    const { error: err } = await supabase
      .from('reservation_lists')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) throw new Error(err.message)
    setReservationLists((prev) =>
      prev.map((l) => (l.id === id ? { ...l, name: name.trim() } : l)),
    )
  }, [])

  const deleteList = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('reservation_lists').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setReservationLists((prev) => prev.filter((l) => l.id !== id))
  }, [])

  return {
    reservationLists,
    isLoading,
    error,
    createList,
    updateList,
    deleteList,
  }
}
