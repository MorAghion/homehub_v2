import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BillStatus } from '../../../types/bills'
import type { BillsData, BillsMutations } from '../../../hooks/useBills'
import BillCard from './BillCard'

type Filter = 'all' | BillStatus

interface Props extends BillsData, BillsMutations {}

export default function BillsHub({ bills, isLoading, error, updateStatus, deleteBill }: Props) {
  const { t } = useTranslation('bills')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = filter === 'all' ? bills : bills.filter((b) => b.status === filter)
  const tabs: Filter[] = ['all', 'pending', 'paid']

  return (
    <div className="flex flex-col min-h-screen bg-(--color-background) pb-24">
      <header className="px-4 pt-12 pb-4 bg-(--color-surface)">
        <h1 className="text-2xl font-bold text-(--color-primary)">{t('title')}</h1>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-(--color-surface) border-b border-(--color-accent)">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === tab
                ? 'bg-(--color-primary) text-white'
                : 'bg-(--color-accent) text-(--color-primary)'
            }`}
          >
            {t(`filter.${tab}`)}
            {tab !== 'all' && (
              <span className="ms-1 opacity-70">
                ({bills.filter((b) => b.status === tab).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 py-4 space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-(--color-surface) animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <p className="text-center text-(--color-error) py-8">{error}</p>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-5xl">🧾</span>
            <p className="text-(--color-muted) text-center">{t('empty')}</p>
          </div>
        )}

        {filtered.map((bill) => (
          <BillCard
            key={bill.id}
            bill={bill}
            onMarkPaid={(id) => void updateStatus(id, 'paid')}
            onDelete={(id) => void deleteBill(id)}
          />
        ))}
      </div>
    </div>
  )
}
