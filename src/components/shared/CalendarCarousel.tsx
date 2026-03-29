import { useTranslation } from 'react-i18next'
import type { CalendarDay } from '../../hooks/useCalendarItems'

interface Props {
  days: CalendarDay[]
}

function formatDayLabel(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function CalendarCarousel({ days }: Props) {
  const { t } = useTranslation('common')

  if (days.length === 0) return null

  return (
    <section className="px-4 py-3">
      <h2 className="text-sm font-semibold text-(--color-muted) uppercase tracking-wide mb-2">
        {t('upcoming', 'Upcoming')}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
        {days.map(({ date, bills, tasks }) => (
          <div
            key={date}
            className="snap-start shrink-0 w-44 rounded-xl bg-(--color-surface) border border-(--color-accent) p-3 space-y-2"
          >
            <p className="text-xs font-bold text-(--color-primary)">{formatDayLabel(date)}</p>
            {bills.map((b) => (
              <div key={b.id} className="flex items-center gap-1.5">
                <span className="text-sm">🧾</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-(--color-primary) truncate">{b.vendor}</p>
                  <p className="text-xs text-(--color-muted)">
                    {b.currency === 'ILS' ? '₪' : b.currency}{b.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-1.5">
                <span className="text-sm">✅</span>
                <p className="text-xs text-(--color-primary) truncate">{t.title}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
