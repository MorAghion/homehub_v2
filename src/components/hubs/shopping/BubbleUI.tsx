/**
 * BubbleUI — Smart Bubbles shown when a Sub-Hub has an empty Master List.
 *
 * PRD §7.3:
 * - One Suggestion Bubble per matched context (from Context Engine)
 * - "Keep Empty" bubble with dashed border
 * - Clicking a Suggestion Bubble injects that context's starter pack
 * - Smart Merge: clicking multiple bubbles adds items without duplicates
 * - Bubble Style: bg-(--color-primary)/10, border-(--color-primary), text-(--color-primary)
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Context, StarterPack } from '../../../lib/contextEngine'
import { getStarterPack } from '../../../lib/contextEngine'

interface BubbleUIProps {
  matchedContexts: Context[]
  onInjectPack: (items: string[]) => void
  onKeepEmpty: () => void
}

export default function BubbleUI({ matchedContexts, onInjectPack, onKeepEmpty }: BubbleUIProps) {
  const { t, i18n } = useTranslation('shopping')
  const isHe = i18n.language === 'he'

  const [injectedContexts, setInjectedContexts] = useState<Set<Context>>(new Set())
  const [accumulatedItems, setAccumulatedItems] = useState<string[]>([])

  function handleBubbleClick(context: Context) {
    const pack: StarterPack = getStarterPack(context)
    const packItems = pack.items.map((item) => (isHe ? item.he : item.en))

    // Smart merge: add new items, skip duplicates (case-insensitive)
    const existingNorm = new Set(accumulatedItems.map((s) => s.toLowerCase().trim()))
    const newItems = packItems.filter((item) => !existingNorm.has(item.toLowerCase().trim()))
    const merged = [...accumulatedItems, ...newItems]

    setInjectedContexts((prev) => new Set([...prev, context]))
    setAccumulatedItems(merged)
    onInjectPack(merged)
  }

  const packs: StarterPack[] = matchedContexts.map(getStarterPack)

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-6"
      data-testid="bubble-ui"
    >
      {packs.length > 0 && (
        <p className="text-sm text-(--color-muted) text-center mb-2">{t('bubbles.title')}</p>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {packs.map((pack) => {
          const isActive = injectedContexts.has(pack.context)
          return (
            <button
              key={pack.context}
              type="button"
              onClick={() => handleBubbleClick(pack.context)}
              data-testid={`bubble-${pack.context}`}
              className={[
                'px-5 py-3 rounded-full text-sm font-semibold',
                'border transition-all',
                isActive
                  ? 'bg-(--color-primary)/20 border-(--color-primary) text-(--color-primary)'
                  : 'bg-(--color-primary)/10 border-(--color-primary) text-(--color-primary)',
                'hover:bg-(--color-primary)/20 active:scale-95',
              ].join(' ')}
            >
              {isHe ? pack.label.he : pack.label.en}
              {isActive && (
                <span className="ms-1.5 text-xs opacity-70">✓</span>
              )}
            </button>
          )
        })}

        {/* Keep Empty bubble */}
        <button
          type="button"
          onClick={onKeepEmpty}
          data-testid="bubble-keep-empty"
          className={[
            'px-5 py-3 rounded-full text-sm font-semibold',
            'border-2 border-dashed border-(--color-muted)/40',
            'text-(--color-muted) bg-transparent',
            'hover:border-(--color-muted)/60 active:scale-95 transition-all',
          ].join(' ')}
        >
          {t('bubbles.keepEmpty')}
        </button>
      </div>
    </div>
  )
}
