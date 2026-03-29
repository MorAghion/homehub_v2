/**
 * BottomNav — fixed bottom navigation bar with 4 tabs.
 *
 * PRD §3.2: Shopping, Tasks, Vouchers, Reservations tabs.
 * Tasks tab shows a red badge with urgent count when count > 0.
 */

import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

interface BottomNavProps {
  urgentCount?: number
}

export default function BottomNav({ urgentCount = 0 }: BottomNavProps) {
  const { t } = useTranslation('common')
  const location = useLocation()
  const navigate = useNavigate()

  function isActive(prefix: string): boolean {
    return location.pathname === prefix || location.pathname.startsWith(prefix + '/')
  }

  const tabs = [
    {
      key: 'shopping',
      label: t('nav.shopping'),
      path: '/shopping',
      active: isActive('/shopping'),
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"
            stroke="currentColor"
            strokeWidth={active ? '2' : '1.5'}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      key: 'tasks',
      label: t('nav.tasks'),
      path: '/tasks',
      active: isActive('/tasks'),
      badge: urgentCount > 0 ? urgentCount : null,
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M9 11l3 3L22 4"
            stroke="currentColor"
            strokeWidth={active ? '2' : '1.5'}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
            stroke="currentColor"
            strokeWidth={active ? '2' : '1.5'}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      key: 'vouchers',
      label: t('nav.vouchers'),
      path: '/vouchers',
      active: isActive('/vouchers'),
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect
            x="2"
            y="6"
            width="20"
            height="12"
            rx="2"
            stroke="currentColor"
            strokeWidth={active ? '2' : '1.5'}
          />
          <path
            d="M2 10h20M6 6v12M18 6v12"
            stroke="currentColor"
            strokeWidth={active ? '2' : '1.5'}
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      key: 'reservations',
      label: t('nav.reservations'),
      path: '/reservations',
      active: isActive('/reservations'),
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect
            x="3"
            y="4"
            width="18"
            height="18"
            rx="2"
            stroke="currentColor"
            strokeWidth={active ? '2' : '1.5'}
          />
          <path
            d="M16 2v4M8 2v4M3 10h18"
            stroke="currentColor"
            strokeWidth={active ? '2' : '1.5'}
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      key: 'bills',
      label: t('nav.bills'),
      path: '/bills',
      active: isActive('/bills'),
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
            stroke="currentColor"
            strokeWidth={active ? '2' : '1.5'}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
            stroke="currentColor"
            strokeWidth={active ? '2' : '1.5'}
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ]

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-(--color-surface) border-t border-(--color-muted)/15 flex"
      aria-label="Main navigation"
    >
      {tabs.map(({ key, label, path, active, badge, icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => navigate(path)}
          data-testid={`nav-tab-${key}`}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          className={[
            'relative flex-1 flex flex-col items-center justify-center py-2.5 gap-1',
            'transition-colors touch-manipulation',
            active ? 'text-(--color-primary)' : 'text-(--color-muted)',
          ].join(' ')}
        >
          <span className="relative">
            {icon(active)}
            {badge !== null && badge !== undefined && (
              <span
                className="absolute -top-1.5 -end-1.5 min-w-[16px] h-4 rounded-full bg-(--color-urgency-critical) text-white text-[10px] font-bold flex items-center justify-center px-0.5 leading-none"
                aria-label={`${badge} urgent items`}
                data-testid="tasks-badge"
              >
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </span>
          <span className={['text-[10px] font-medium leading-none', active ? 'font-semibold' : ''].join(' ')}>
            {label}
          </span>
        </button>
      ))}
    </nav>
  )
}
