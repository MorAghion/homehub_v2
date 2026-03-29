import { useTranslation } from 'react-i18next'
import type { Bill } from '../../../types/bills'

const CATEGORY_ICONS: Record<string, string> = {
  telecom: '📱',
  energy: '⛽',
  electricity: '💡',
  water: '💧',
  grocery: '🛒',
  pharmacy: '💊',
}

interface Props {
  bill: Bill
  onMarkPaid: (id: string) => void
  onDelete: (id: string) => void
}

export default function BillCard({ bill, onMarkPaid, onDelete }: Props) {
  const { t } = useTranslation('bills')
  const icon = CATEGORY_ICONS[bill.category ?? ''] ?? '🧾'
  const isPaid = bill.status === 'paid'

  const formatAmount = (amount: number, currency: string) => {
    if (currency === 'ILS') return `₪${amount.toLocaleString()}`
    if (currency === 'USD') return `$${amount.toLocaleString()}`
    if (currency === 'EUR') return `€${amount.toLocaleString()}`
    return `${amount} ${currency}`
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl bg-(--color-surface) border ${isPaid ? 'opacity-50 border-(--color-accent)' : 'border-(--color-accent)'}`}>
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-(--color-primary) truncate">{bill.vendor}</p>
        <p className="text-sm text-(--color-muted)">{formatDate(bill.date)}</p>
      </div>
      <div className="text-end">
        <p className="font-bold text-(--color-primary)">{formatAmount(bill.amount, bill.currency)}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full ${isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {isPaid ? t('paid') : t('pending')}
        </span>
      </div>
      <div className="flex flex-col gap-1 ms-2">
        {!isPaid && (
          <button
            onClick={() => onMarkPaid(bill.id)}
            className="text-xs px-2 py-1 rounded-lg bg-(--color-primary) text-white"
          >
            {t('markPaid')}
          </button>
        )}
        <button
          onClick={() => onDelete(bill.id)}
          className="text-xs px-2 py-1 rounded-lg text-(--color-muted) hover:text-red-500"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
