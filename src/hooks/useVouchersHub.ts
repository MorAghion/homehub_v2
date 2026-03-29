/**
 * useVouchersHub — Sub-Hub CRUD and Supabase Realtime for the Vouchers Hub.
 *
 * Provides:
 *   - All voucher sub-hubs (lists) for the current household
 *   - CRUD operations for sub-hubs
 *   - Realtime subscription on the voucher_lists table
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { VoucherList } from '../types/vouchers'

export interface VouchersHubData {
  voucherLists: VoucherList[]
  isLoading: boolean
  error: string | null
}

export interface VouchersHubMutations {
  createList: (name: string) => Promise<VoucherList>
  updateList: (id: string, name: string) => Promise<void>
  deleteList: (id: string) => Promise<void>
}

export function useVouchersHub(householdId: string | null): VouchersHubData & VouchersHubMutations {
  const [voucherLists, setVoucherLists] = useState<VoucherList[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!householdId) return
    setError(null)
    const { data, error: fetchErr } = await supabase
      .from('voucher_lists')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true })
    if (fetchErr) {
      setError(fetchErr.message)
    } else {
      setVoucherLists((data as VoucherList[]) ?? [])
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
      .channel(`voucher_lists:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voucher_lists',
          filter: `household_id=eq.${householdId}`,
        },
        () => { void fetchAll() },
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [householdId, fetchAll])

  const createList = useCallback(
    async (name: string): Promise<VoucherList> => {
      if (!householdId) throw new Error('No household')
      const { data, error: err } = await supabase
        .from('voucher_lists')
        .insert({ household_id: householdId, name: name.trim() })
        .select()
        .single()
      if (err || !data) throw new Error(err?.message ?? 'Failed to create list')
      const newList = data as VoucherList
      setVoucherLists((prev) => [...prev, newList])
      return newList
    },
    [householdId],
  )

  const updateList = useCallback(async (id: string, name: string): Promise<void> => {
    const { error: err } = await supabase
      .from('voucher_lists')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) throw new Error(err.message)
    setVoucherLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: name.trim() } : l)))
  }, [])

  const deleteList = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('voucher_lists').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setVoucherLists((prev) => prev.filter((l) => l.id !== id))
  }, [])

  return {
    voucherLists,
    isLoading,
    error,
    createList,
    updateList,
    deleteList,
  }
}
