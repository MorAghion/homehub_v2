/**
 * HomePage — Root dashboard with 4 hub cards and Attention Banner.
 *
 * PRD §3.2: Grid of 4 hub cards (Shopping, Tasks, Vouchers, Reservations).
 * PRD §3.3: Attention Banner — non-blocking, shows urgent item count,
 *           taps to Urgent Tasks view, auto-dismisses when count = 0.
 */

import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../contexts/AuthContext'
import { useUrgentTasks } from '../hooks/useUrgentTasks'

export default function HomePage() {
  const { t } = useTranslation('home')
  const navigate = useNavigate()
  const { household } = useSession()
  const urgent = useUrgentTasks(household?.id ?? null)

  const urgentCount = urgent.totalCount

  const hubs = [
    {
      key: 'shopping',
      label: t('hubs.shopping'),
      path: '/shopping',
      emoji: '🛒',
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-500',
    },
    {
      key: 'tasks',
      label: t('hubs.tasks'),
      path: '/tasks',
      emoji: '✅',
      bg: 'bg-orange-50',
      iconBg: 'bg-(--color-primary)',
    },
    {
      key: 'vouchers',
      label: t('hubs.vouchers'),
      path: '/vouchers',
      emoji: '🎟️',
      bg: 'bg-green-50',
      iconBg: 'bg-green-600',
    },
    {
      key: 'reservations',
      label: t('hubs.reservations'),
      path: '/reservations',
      emoji: '📅',
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-600',
    },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-(--color-background)">
      {/* Header */}
      <header className="bg-(--color-primary) px-4 pt-10 pb-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">{t('dashboard.title')}</h1>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
            aria-label="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="6" r="3" stroke="white" strokeWidth="1.5" />
              <path d="M3 17c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {/* Attention Banner — §3.3: shown when urgentCount > 0, auto-dismisses when 0 */}
      {urgentCount > 0 && (
        <button
          type="button"
          onClick={() => navigate('/tasks/urgent')}
          data-testid="attention-banner"
          className="w-full flex items-center gap-3 px-4 py-3 bg-(--color-urgency-critical)/10 border-b border-(--color-urgency-critical)/20 text-start"
        >
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-(--color-urgency-critical) flex items-center justify-center">
            <span className="text-white font-bold text-xs leading-none" aria-hidden="true">!</span>
          </span>
          <p className="flex-1 text-sm font-semibold text-(--color-urgency-critical)">
            {t('attentionBanner.message_other', { count: urgentCount })}
          </p>
          <span className="text-xs font-bold text-(--color-urgency-critical) flex-shrink-0" aria-hidden="true">
            {t('attentionBanner.cta')} →
          </span>
        </button>
      )}

      {/* Hub cards grid — §3.2 */}
      <main className="flex-1 px-4 py-5 pb-24">
        <div className="grid grid-cols-2 gap-4">
          {hubs.map(({ key, label, path, emoji, bg, iconBg }) => (
            <button
              key={key}
              type="button"
              onClick={() => navigate(path)}
              data-testid={`hub-card-${key}`}
              className={[
                'flex flex-col items-start p-4 rounded-2xl shadow-sm',
                'min-h-[120px] cursor-pointer transition-all',
                'hover:shadow-md active:scale-[0.98]',
                bg,
              ].join(' ')}
            >
              <div
                className={[
                  'w-12 h-12 rounded-xl flex items-center justify-center mb-3',
                  iconBg,
                ].join(' ')}
              >
                <span className="text-2xl" role="img" aria-label={label}>
                  {emoji}
                </span>
              </div>
              <p className="text-[15px] font-bold text-[#1a1a1a] leading-snug">{label}</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
