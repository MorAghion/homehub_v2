import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Bill, BillInput, BillStatus } from '../types/bills'

export interface BillsData {
  bills: Bill[]
  isLoading: boolean
  error: string | null
}

export interface BillsMutations {
  addBill: (input: BillInput) => Promise<void>
  updateStatus: (id: string, status: BillStatus) => Promise<void>
  deleteBill: (id: string) => Promise<void>
}

export function useBills(householdId: string | null): BillsData & BillsMutations {
  const [bills, setBills] = useState<Bill[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBills = useCallback(async () => {
    if (!householdId) return
    setIsLoading(true)
    const { data, error: err } = await supabase
      .from('bills')
      .select('*')
      .eq('household_id', householdId)
      .order('date', { ascending: false })
    setIsLoading(false)
    if (err) { setError(err.message); return }
    setBills((data ?? []) as Bill[])
  }, [householdId])

  useEffect(() => { void fetchBills() }, [fetchBills])

  const addBill = useCallback(async (input: BillInput) => {
    if (!householdId) return
    const { data, error: err } = await supabase
      .from('bills')
      .insert({ ...input, household_id: householdId, status: 'pending' })
      .select()
      .single()
    if (err) throw new Error(err.message)
    setBills((prev) => [data as Bill, ...prev])
  }, [householdId])

  const updateStatus = useCallback(async (id: string, status: BillStatus) => {
    const { error: err } = await supabase.from('bills').update({ status }).eq('id', id)
    if (err) throw new Error(err.message)
    setBills((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)))
  }, [])

  const deleteBill = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('bills').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setBills((prev) => prev.filter((b) => b.id !== id))
  }, [])

  return { bills, isLoading, error, addBill, updateStatus, deleteBill }
}
