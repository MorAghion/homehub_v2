/**
 * useShoppingHub — Sub-Hub CRUD and Supabase Realtime subscriptions for the Shopping Hub.
 *
 * Provides:
 *   - All shopping lists (sub-hubs) for the current household
 *   - All shopping items for a given list_id
 *   - CRUD operations for lists and items
 *   - Custom category mappings for smart category learning (§7.7)
 *   - Realtime subscription per CLAUDE.md §4.9
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { autoCategorize, type ListCategory } from '../lib/autoCategorize'
import { isDuplicate } from '../lib/shopping'
import type { ShoppingList, ShoppingItem, CustomCategoryMapping } from '../types/shopping'

export interface ShoppingHubData {
  shoppingLists: ShoppingList[]
  itemsByListId: Record<string, ShoppingItem[]>
  /** Custom mappings keyed by normalized item_name. */
  customMappings: ReadonlyMap<string, ListCategory>
  isLoading: boolean
  error: string | null
}

export interface ShoppingHubMutations {
  createList: (name: string, context?: string | null) => Promise<ShoppingList>
  updateList: (id: string, name: string) => Promise<void>
  deleteList: (id: string) => Promise<void>
  addItem: (listId: string, text: string, quantity?: string | null) => Promise<ShoppingItem | null>
  updateItem: (id: string, input: Partial<ShoppingItem>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  deleteItems: (ids: string[]) => Promise<void>
  toggleChecked: (item: ShoppingItem) => Promise<void>
  clearSession: (listId: string) => Promise<void>
  saveCustomMapping: (itemName: string, category: ListCategory) => Promise<void>
}

export function useShoppingHub(householdId: string | null): ShoppingHubData & ShoppingHubMutations {
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([])
  const [itemsByListId, setItemsByListId] = useState<Record<string, ShoppingItem[]>>({})
  const [customMappings, setCustomMappings] = useState<ReadonlyMap<string, ListCategory>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItemsForAllLists = useCallback(async (lists: ShoppingList[]) => {
    if (lists.length === 0) {
      setItemsByListId({})
      return
    }
    const listIds = lists.map((l) => l.id)
    const { data, error: fetchErr } = await supabase
      .from('shopping_items')
      .select('*')
      .in('list_id', listIds)
      .order('created_at', { ascending: true })
    if (fetchErr) {
      setError(fetchErr.message)
      return
    }
    const byListId: Record<string, ShoppingItem[]> = {}
    for (const list of lists) {
      byListId[list.id] = []
    }
    for (const item of (data as ShoppingItem[]) ?? []) {
      const existing = byListId[item.list_id] ?? []
      existing.push(item)
      byListId[item.list_id] = existing
    }
    setItemsByListId(byListId)
  }, [])

  const fetchCustomMappings = useCallback(async () => {
    if (!householdId) return
    const { data } = await supabase
      .from('custom_category_mappings')
      .select('item_name, category')
      .eq('household_id', householdId)
    if (!data) return
    const map = new Map<string, ListCategory>()
    for (const row of data as Pick<CustomCategoryMapping, 'item_name' | 'category'>[]) {
      map.set(row.item_name, row.category)
    }
    setCustomMappings(map)
  }, [householdId])

  const fetchAll = useCallback(async () => {
    if (!householdId) return
    setError(null)

    const { data: listsData, error: listsErr } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true })

    if (listsErr) {
      setError(listsErr.message)
      setIsLoading(false)
      return
    }

    const lists = (listsData as ShoppingList[]) ?? []
    setShoppingLists(lists)

    await Promise.all([
      fetchItemsForAllLists(lists),
      fetchCustomMappings(),
    ])

    setIsLoading(false)
  }, [householdId, fetchItemsForAllLists, fetchCustomMappings])

  useEffect(() => {
    if (!householdId) {
      setIsLoading(false)
      return
    }
    void fetchAll()
  }, [householdId, fetchAll])

  // Realtime: subscribe to shopping_lists parent table
  useEffect(() => {
    if (!householdId) return

    const channel = supabase
      .channel(`household:${householdId}:shopping`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_lists',
          filter: `household_id=eq.${householdId}`,
        },
        () => { void fetchAll() },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [householdId, fetchAll])

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const createList = useCallback(
    async (name: string, context: string | null = null): Promise<ShoppingList> => {
      if (!householdId) throw new Error('No household')
      const { data, error: err } = await supabase
        .from('shopping_lists')
        .insert({ household_id: householdId, name: name.trim(), context })
        .select()
        .single()
      if (err || !data) throw new Error(err?.message ?? 'Failed to create list')
      const newList = data as ShoppingList
      setShoppingLists((prev) => [...prev, newList])
      setItemsByListId((prev) => ({ ...prev, [newList.id]: [] }))
      return newList
    },
    [householdId],
  )

  const updateList = useCallback(async (id: string, name: string): Promise<void> => {
    const { error: err } = await supabase
      .from('shopping_lists')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) throw new Error(err.message)
    setShoppingLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: name.trim() } : l)))
  }, [])

  const deleteList = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('shopping_lists').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setShoppingLists((prev) => prev.filter((l) => l.id !== id))
    setItemsByListId((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const addItem = useCallback(
    async (listId: string, text: string, quantity: string | null = null): Promise<ShoppingItem | null> => {
      const existing = itemsByListId[listId] ?? []
      if (isDuplicate(text, existing)) return null

      const category = autoCategorize(text, customMappings)

      const { data, error: err } = await supabase
        .from('shopping_items')
        .insert({
          list_id: listId,
          text: text.trim(),
          quantity,
          checked: false,
          category,
          in_master: true,
        })
        .select()
        .single()
      if (err || !data) throw new Error(err?.message ?? 'Failed to add item')
      const newItem = data as ShoppingItem
      setItemsByListId((prev) => ({
        ...prev,
        [listId]: [...(prev[listId] ?? []), newItem],
      }))
      return newItem
    },
    [itemsByListId, customMappings],
  )

  const updateItem = useCallback(async (id: string, input: Partial<ShoppingItem>): Promise<void> => {
    const { error: err } = await supabase
      .from('shopping_items')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) throw new Error(err.message)
    setItemsByListId((prev) => {
      const next = { ...prev }
      for (const listId of Object.keys(next)) {
        next[listId] = (next[listId] ?? []).map((i) => (i.id === id ? { ...i, ...input } : i))
      }
      return next
    })
  }, [])

  const deleteItem = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('shopping_items').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setItemsByListId((prev) => {
      const next = { ...prev }
      for (const listId of Object.keys(next)) {
        next[listId] = (next[listId] ?? []).filter((i) => i.id !== id)
      }
      return next
    })
  }, [])

  const deleteItems = useCallback(async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return
    const { error: err } = await supabase.from('shopping_items').delete().in('id', ids)
    if (err) throw new Error(err.message)
    const idSet = new Set(ids)
    setItemsByListId((prev) => {
      const next = { ...prev }
      for (const listId of Object.keys(next)) {
        next[listId] = (next[listId] ?? []).filter((i) => !idSet.has(i.id))
      }
      return next
    })
  }, [])

  const toggleChecked = useCallback(async (item: ShoppingItem): Promise<void> => {
    const newChecked = !item.checked
    await updateItem(item.id, { checked: newChecked })
  }, [updateItem])

  const clearSession = useCallback(
    async (listId: string): Promise<void> => {
      const items = itemsByListId[listId] ?? []
      const checkedIds = items.filter((i) => i.checked).map((i) => i.id)
      if (checkedIds.length === 0) return
      // Uncheck all (don't delete — items stay on Master List)
      const { error: err } = await supabase
        .from('shopping_items')
        .update({ checked: false, updated_at: new Date().toISOString() })
        .in('id', checkedIds)
      if (err) throw new Error(err.message)
      setItemsByListId((prev) => ({
        ...prev,
        [listId]: (prev[listId] ?? []).map((i) =>
          checkedIds.includes(i.id) ? { ...i, checked: false } : i,
        ),
      }))
    },
    [itemsByListId],
  )

  const saveCustomMapping = useCallback(
    async (itemName: string, category: ListCategory): Promise<void> => {
      if (!householdId) throw new Error('No household')
      const normalized = itemName.toLowerCase().trim()
      const { error: err } = await supabase
        .from('custom_category_mappings')
        .upsert(
          {
            household_id: householdId,
            item_name: normalized,
            category,
          },
          { onConflict: 'household_id,item_name' },
        )
      if (err) throw new Error(err.message)
      setCustomMappings((prev) => {
        const next = new Map(prev)
        next.set(normalized, category)
        return next
      })
    },
    [householdId],
  )

  return {
    shoppingLists,
    itemsByListId,
    customMappings,
    isLoading,
    error,
    createList,
    updateList,
    deleteList,
    addItem,
    updateItem,
    deleteItem,
    deleteItems,
    toggleChecked,
    clearSession,
    saveCustomMapping,
  }
}
