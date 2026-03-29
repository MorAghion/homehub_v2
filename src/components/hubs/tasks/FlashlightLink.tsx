/**
 * FlashlightLink — navigates to the source sub-hub and applies a 3-second pulsing glow
 * animation to highlight the target task.
 *
 * PRD §8.5: navigate to source sub-hub, scroll task into view, 3-second pulsing glow.
 *
 * The glow animation is applied via a CSS class added to the target task element
 * after navigation. The target element is identified by `data-task-id` attribute.
 */

import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { buildFlashlightRoute, type Task } from '../../../lib/tasks'

interface FlashlightLinkProps {
  task: Task
  listName: string
}

/** Duration of the pulsing glow animation in ms. */
const FLASHLIGHT_DURATION_MS = 3000

/**
 * Applies a pulsing glow highlight to a task element identified by data-task-id.
 * Called after navigation settles. Scrolls into view then adds/removes CSS class.
 */
export function applyFlashlightGlow(taskId: string): void {
  // Use requestAnimationFrame to wait for DOM to render after navigation
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-task-id="${taskId}"]`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('flashlight-glow')
    setTimeout(() => el.classList.remove('flashlight-glow'), FLASHLIGHT_DURATION_MS)
  })
}

export default function FlashlightLink({ task, listName }: FlashlightLinkProps) {
  const { t } = useTranslation('tasks')
  const navigate = useNavigate()

  function handleClick(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation()
    const route = buildFlashlightRoute(task)
    navigate(route)
    // Glow will be applied by the target page when it reads the flashlight param
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e) }}
      aria-label={`${t('flashlight.goToSource')}: ${listName}`}
      data-testid="flashlight-link"
      className={[
        'flex-shrink-0 p-1.5 rounded-md',
        'text-(--color-muted) hover:text-(--color-primary)',
        'transition-colors',
      ].join(' ')}
    >
      {/* Arrow pointing to source */}
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path
          d="M9 3l6 6-6 6M3 9h12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
