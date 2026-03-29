/**
 * EditModeContext — scoped per hub page.
 *
 * Provides edit mode state (isEditMode, selectedIds) and actions
 * to descendant components via context, avoiding prop drilling through
 * HubGrid → SubHubCard.
 *
 * Each hub page creates its own Provider wrapping its content.
 * Do NOT lift this to a global context — edit mode exits on navigation.
 */

import { createContext, useContext, useState } from 'react'

export interface EditModeContextValue {
  isEditMode: boolean
  selectedIds: Set<string>
  toggleSelection: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
  enterEditMode: (initialId?: string) => void
  exitEditMode: () => void
}

export const EditModeContext = createContext<EditModeContextValue | null>(null)

export function useEditMode(): EditModeContextValue {
  const ctx = useContext(EditModeContext)
  if (!ctx) {
    throw new Error('useEditMode must be used within an EditModeContext.Provider')
  }
  return ctx
}

/**
 * Convenience hook for creating edit mode state to pass into EditModeContext.Provider.
 * Use this in hub page components:
 *
 *   const editMode = useEditModeState()
 *   return (
 *     <EditModeContext.Provider value={editMode}>
 *       ...
 *     </EditModeContext.Provider>
 *   )
 */
export function useEditModeState(): EditModeContextValue {
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelection = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const selectAll = (ids: string[]) => setSelectedIds(new Set(ids))

  const clearSelection = () => setSelectedIds(new Set())

  const enterEditMode = (initialId?: string) => {
    setIsEditMode(true)
    if (initialId) setSelectedIds(new Set([initialId]))
  }

  const exitEditMode = () => {
    setIsEditMode(false)
    setSelectedIds(new Set())
  }

  return {
    isEditMode,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    enterEditMode,
    exitEditMode,
  }
}
