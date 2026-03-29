/**
 * UrgentTasksView — virtual view aggregating all is_urgent=true tasks and overdue bills.
 *
 * PRD §8.4: flat list combining urgent tasks (with source sub-hub label)
 * and overdue bills (bill icon, vendor, amount, red due date, Pay Now).
 * Mockup: urgent-tasks.html
 */

import { useTranslation } from 'react-i18next'
import { type UrgentItem } from '../../../lib/tasks'
import FlashlightLink from './FlashlightLink'

interface UrgentTasksViewProps {
  items: UrgentItem[]
  isLoading: boolean
  onBack: () => void
}

export default function UrgentTasksView({ items, isLoading, onBack }: UrgentTasksViewProps) {
  const { t } = useTranslation('tasks')

  const taskItems = items.filter((i) => i.kind === 'task') as Extract<UrgentItem, { kind: 'task' }>[]
  const billItems = items.filter((i) => i.kind === 'bill') as Extract<UrgentItem, { kind: 'bill' }>[]

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00Z')
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex flex-col min-h-screen bg-[--color-background]">
      {/* Header */}
      <header className="bg-[--color-urgency-critical] px-4 py-3.5 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('hub.doneEditing')}
          className="text-white/85 hover:text-white p-1 rounded-md transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path d="M14 5l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white leading-tight">{t('urgentTasks.title')}</h1>
          <p className="text-[11px] text-white/75 mt-0.5">
            {t('urgentTasks.subtitle', { count: items.length })}
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 pb-20" data-testid="urgent-tasks-view">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-[--color-muted]">
            <span className="block text-2xl mb-2">⏳</span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center" data-testid="urgent-empty-state">
            <span className="block text-3xl mb-3">✅</span>
            <p className="text-sm text-[--color-muted]">{t('urgentTasks.emptyState')}</p>
          </div>
        ) : (
          <>
            {/* Tasks section */}
            {taskItems.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-4 pt-3.5 pb-1.5">
                  <span className="text-xs" aria-hidden="true">⚡</span>
                  <span className="text-xs font-bold text-[--color-muted] uppercase tracking-wider">
                    {t('urgentTasks.tasksSection')}
                  </span>
                  <span className="text-xs font-bold text-[--color-muted] bg-[--color-muted]/15 rounded-full px-2 py-0.5">
                    {taskItems.length}
                  </span>
                </div>

                {taskItems.map(({ task, listName }) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-4 py-3.5 bg-[--color-surface] border-b border-[--color-muted]/10"
                    data-testid="urgent-task-row"
                  >
                    {/* Urgency badge */}
                    <span
                      className={[
                        'flex-shrink-0 text-[10px] font-bold uppercase tracking-wide rounded-sm px-1.5 py-0.5',
                        task.urgency === 'critical'
                          ? 'bg-[--color-urgency-critical]/12 text-[--color-urgency-critical]'
                          : task.urgency === 'high'
                          ? 'bg-[--color-urgency-high]/12 text-[--color-urgency-high]'
                          : task.urgency === 'medium'
                          ? 'bg-[--color-urgency-medium]/12 text-[--color-urgency-medium]'
                          : 'bg-[--color-urgency-low]/12 text-[--color-urgency-low]',
                      ].join(' ')}
                      data-testid="urgency-badge"
                    >
                      {t(`urgency.${task.urgency}`)}
                    </span>

                    {/* Task info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-[#1a1a1a] truncate leading-snug mb-0.5">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[10px] font-semibold rounded-sm px-1.5 py-0.5 bg-[--color-primary]/8 text-[--color-primary]"
                          data-testid="subhub-label"
                        >
                          {listName}
                        </span>
                        {task.due_date && (
                          <span className="text-xs text-[--color-muted]">
                            {formatDate(task.due_date)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Flashlight deep-link */}
                    <FlashlightLink task={task} listName={listName} />
                  </div>
                ))}
              </>
            )}

            {/* Divider between tasks and bills */}
            {taskItems.length > 0 && billItems.length > 0 && (
              <div className="h-2 bg-[--color-background] border-t border-b border-[--color-muted]/15" />
            )}

            {/* Bills section */}
            {billItems.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-4 pt-3.5 pb-1.5">
                  <span className="text-xs" aria-hidden="true">📄</span>
                  <span className="text-xs font-bold text-[--color-muted] uppercase tracking-wider">
                    {t('urgentTasks.billsSection')}
                  </span>
                  <span className="text-xs font-bold text-[--color-muted] bg-[--color-muted]/15 rounded-full px-2 py-0.5">
                    {billItems.length}
                  </span>
                </div>

                {billItems.map(({ bill }) => (
                  <div
                    key={bill.id}
                    className="flex items-center gap-3 px-4 py-3.5 bg-[--color-surface] border-b border-[--color-muted]/10"
                    data-testid="bill-row"
                  >
                    {/* Bill icon */}
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[--color-error]/8 flex-shrink-0">
                      <span className="text-lg" aria-hidden="true">💳</span>
                    </div>

                    {/* Bill info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[15px] font-semibold text-[#1a1a1a] truncate">{bill.vendor_name}</p>
                        <p className="text-[15px] font-bold text-[#1a1a1a] ms-2 flex-shrink-0">{bill.amount}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[--color-urgency-critical]">
                          {formatDate(bill.due_date)}
                        </p>
                        <button
                          type="button"
                          className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-[--color-urgency-critical] text-white hover:opacity-90 transition-opacity"
                        >
                          {t('urgentTasks.payNow')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
