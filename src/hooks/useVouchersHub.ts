/**
 * useVouchersHub — Sub-Hub CRUD + Supabase Realtime for the Vouchers hub.
 *
 * Manages the list of Sub-Hubs (groups) within the Vouchers hub for the
 * current household. Subscribes to Realtime changes on the sub_hubs table.
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { SubHub } from '../types/subHub'
import { useSession } from '../contexts/AuthContext'

export interface VouchersHubData {
  subHubs: SubHub[]
  isLoading: boolean
  error: string | null
}

export interface VouchersHubMutations {
  createSubHub: (name: string) => Promise<SubHub>
  renameSubHub: (id: string, name: string) => Promise<void>
  deleteSubHub: (id: string) => Promise<void>
  deleteSubHubs: (ids: string[]) => Promise<void>
}

export function useVouchersHub(): VouchersHubData & VouchersHubMutations {
  const { household } = useSession()
  const [subHubs, setSubHubs] = useState<SubHub[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ─── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!household) return
    try {
      setError(null)
      const { data, error: qErr } = await supabase
        .from('sub_hubs')
        .select('*')
        .eq('household_id', household.id)
        .eq('hub_type', 'vouchers')
        .order('position', { ascending: true })
      if (qErr) throw qErr
      setSubHubs((data ?? []) as SubHub[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load voucher groups')
    } finally {
      setIsLoading(false)
    }
  }, [household])

  useEffect(() => {
    void load()
  }, [load])

  // ─── Realtime ──────────────────────────────────────────────────────────────
  // Subscribe to sub_hubs for vouchers. Re-fetch on any change.

  useEffect(() => {
    if (!household) return

    const channel = supabase
      .channel(`household:${household.id}:vouchers-sub-hubs`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sub_hubs',
          filter: `household_id=eq.${household.id}`,
        },
        () => void load(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [household, load])

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const createSubHub = useCallback(
    async (name: string): Promise<SubHub> => {
      if (!household) throw new Error('No household')
      const nextPosition = subHubs.length
      const { data, error: iErr } = await supabase
        .from('sub_hubs')
        .insert({
          household_id: household.id,
          hub_type: 'vouchers',
          name: name.trim(),
          position: nextPosition,
        })
        .select()
        .single()
      if (iErr) throw iErr
      return data as SubHub
    },
    [household, subHubs.length],
  )

  const renameSubHub = useCallback(async (id: string, name: string): Promise<void> => {
    const { error: uErr } = await supabase
      .from('sub_hubs')
      .update({ name: name.trim() })
      .eq('id', id)
    if (uErr) throw uErr
  }, [])

  const deleteSubHub = useCallback(async (id: string): Promise<void> => {
    const { error: dErr } = await supabase.from('sub_hubs').delete().eq('id', id)
    if (dErr) throw dErr
  }, [])

  const deleteSubHubs = useCallback(async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return
    const { error: dErr } = await supabase
      .from('sub_hubs')
      .delete()
      .in('id', ids)
    if (dErr) throw dErr
  }, [])

  return {
    subHubs,
    isLoading,
    error,
    createSubHub,
    renameSubHub,
    deleteSubHub,
    deleteSubHubs,
  }
}
