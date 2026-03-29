/**
 * TaskCard — displays a single task row.
 *
 * Shows: title, urgency badge, status, assignee avatar, due date, is_urgent flag.
 * PRD §8.2, §8.3, mockup: task-detail.html
 */

import { useTranslation } from 'react-i18next'
import { isTaskDueToday, isTaskOverdue, type Task, type TaskUrgency } from '../../../lib/tasks'
import type { UserProfile } from '../../../types/user'

interface TaskCardProps {
  task: Task
  members: UserProfile[]
  isSelected?: boolean
  isEditMode?: boolean
  onClick: (task: Task) => void
  onToggleSelect?: (taskId: string) => void
}

const URGENCY_CLASSES: Record<TaskUrgency, { badge: string; dot: string }> = {
  low:      { badge: 'bg-(--color-urgency-low)/10 text-(--color-urgency-low)',      dot: 'bg-(--color-urgency-low)' },
  medium:   { badge: 'bg-(--color-urgency-medium)/10 text-(--color-urgency-medium)', dot: 'bg-(--color-urgency-medium)' },
  high:     { badge: 'bg-(--color-urgency-high)/10 text-(--color-urgency-high)',     dot: 'bg-(--color-urgency-high)' },
  critical: { badge: 'bg-(--color-urgency-critical)/10 text-(--color-urgency-critical)', dot: 'bg-(--color-urgency-critical)' },
}

export default function TaskCard({
  task,
  members,
  isSelected = false,
  isEditMode = false,
  onClick,
  onToggleSelect,
}: TaskCardProps) {
  const { t } = useTranslation('tasks')

  const assignee = members.find((m) => m.id === task.assignee_id)
  const urgencyStyle = URGENCY_CLASSES[task.urgency]
  const overdue = isTaskOverdue(task)
  const dueToday = isTaskDueToday(task)
  const isDone = task.status === 'done'

  function formatDueDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00Z')
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  function handleClick() {
    if (isEditMode && onToggleSelect) {
      onToggleSelect(task.id)
    } else {
      onClick(task)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      aria-pressed={isEditMode ? isSelected : undefined}
      data-testid="task-card"
      className={[
        'flex items-center gap-3 px-4 py-3',
        'bg-(--color-surface) border-b border-(--color-muted)/10',
        'cursor-pointer transition-colors',
        isDone ? 'opacity-60' : '',
        isSelected ? 'bg-(--color-primary)/5' : 'hover:bg-(--color-muted)/5',
      ].join(' ')}
    >
      {/* Edit mode: checkbox */}
      {isEditMode && (
        <div
          className={[
            'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
            isSelected
              ? 'border-(--color-primary) bg-(--color-primary)'
              : 'border-(--color-muted)/40',
          ].join(' ')}
          aria-hidden="true"
        >
          {isSelected && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
              <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}

      {/* Urgency dot */}
      {!isEditMode && (
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${urgencyStyle.dot}`} aria-hidden="true" />
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={[
              'text-sm font-medium leading-snug truncate',
              isDone ? 'line-through text-(--color-muted)' : 'text-[#1a1a1a]',
            ].join(' ')}
          >
            {task.title}
          </span>
          {task.is_urgent && !isDone && (
            <span aria-label={t('taskCard.urgentFlag')} title={t('taskCard.urgentFlag')}>
              ⚡
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Urgency badge */}
          <span
            className={`text-[10px] font-bold uppercase tracking-wide rounded-sm px-1.5 py-0.5 ${urgencyStyle.badge}`}
            data-testid="urgency-badge"
          >
            {t(`urgency.${task.urgency}`)}
          </span>

          {/* Due date */}
          {task.due_date && (
            <span
              className={[
                'text-xs font-medium',
                overdue ? 'text-(--color-urgency-critical)' : dueToday ? 'text-(--color-urgency-high)' : 'text-(--color-muted)',
              ].join(' ')}
            >
              {overdue
                ? t('taskCard.overdue')
                : dueToday
                ? t('taskCard.dueToday')
                : t('taskCard.due', { date: formatDueDate(task.due_date) })}
            </span>
          )}

          {/* Assignee */}
          {assignee && (
            <span className="text-xs text-(--color-muted) truncate max-w-[80px]">
              {assignee.display_name}
            </span>
          )}
        </div>
      </div>

      {/* Status indicator for done */}
      {isDone && !isEditMode && (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="flex-shrink-0 text-(--color-success)">
          <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5.5 9l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}

      {/* Chevron for open tasks */}
      {!isDone && !isEditMode && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-shrink-0 text-(--color-muted)/50">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}
