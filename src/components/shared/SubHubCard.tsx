/**
 * SubHubCard — a single Sub-Hub entry in the hub grid.
 *
 * Handles tap navigation and, when edit mode is active, shows a checkbox
 * overlay and manages selection via EditModeContext.
 *
 * Long-press triggers edit mode on the parent hub (via onLongPress callback).
 */

import { useRef } from 'react'
import type { SubHub } from '../../types/subHub'
import { useEditMode } from '../../contexts/EditModeContext'

interface SubHubCardProps {
  subHub: SubHub
  itemCount?: number
  onTap: () => void
  onLongPress?: () => void
}

const LONG_PRESS_MS = 500

export default function SubHubCard({
  subHub,
  itemCount,
  onTap,
  onLongPress,
}: SubHubCardProps) {
  const { isEditMode, selectedIds, toggleSelection, enterEditMode } = useEditMode()
  const isSelected = selectedIds.has(subHub.id)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handlePointerDown() {
    if (!onLongPress) return
    timerRef.current = setTimeout(() => {
      enterEditMode(subHub.id)
      onLongPress()
    }, LONG_PRESS_MS)
  }

  function handlePointerUp() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function handleClick() {
    if (isEditMode) {
      toggleSelection(subHub.id)
    } else {
      onTap()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick()
      }}
      className={[
        'relative bg-[--color-surface] rounded-xl shadow-sm',
        'p-4 flex flex-col gap-1 cursor-pointer select-none',
        'transition-shadow active:shadow-md',
        isEditMode && isSelected ? 'ring-2 ring-[--color-primary]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Edit mode checkbox overlay */}
      {isEditMode && (
        <div
          className={[
            'absolute top-2 end-2 w-5 h-5 rounded-full border-2 flex items-center justify-center',
            isSelected
              ? 'bg-[--color-primary] border-[--color-primary]'
              : 'bg-[--color-surface] border-[--color-muted]',
          ].join(' ')}
          aria-hidden="true"
        >
          {isSelected && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path
                d="M1 3.5L4 6.5L9 1"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      )}

      {/* Name */}
      <span className="text-base font-semibold text-[#1a1a1a] leading-snug line-clamp-2">
        {subHub.name}
      </span>

      {/* Item count badge */}
      {itemCount !== undefined && (
        <span className="text-xs text-[--color-muted]">{itemCount}</span>
      )}
    </div>
  )
}
