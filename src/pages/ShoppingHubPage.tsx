/**
 * ShoppingHubPage — route-level page for the Shopping Hub.
 *
 * Routes:
 *   /shopping        → main hub grid (ShoppingHub component)
 *   /shopping/:id    → sub-hub view (Master List + Active List tabs)
 *
 * PRD §7: Shopping Hub
 */

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSession } from '../contexts/AuthContext'
import { useShoppingHub } from '../hooks/useShoppingHub'
import ShoppingHub from '../components/hubs/shopping/ShoppingHub'
import MasterListView from '../components/hubs/shopping/MasterListView'
import ActiveListView from '../components/hubs/shopping/ActiveListView'
import { detectContext } from '../lib/contextEngine'
import type { ShoppingItem } from '../types/shopping'
import type { ListCategory } from '../lib/autoCategorize'

type Tab = 'master' | 'active'

export default function ShoppingHubPage() {
  const { id: listId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('shopping')
  const { t: tc } = useTranslation('common')
  const { household } = useSession()

  const hub = useShoppingHub(household?.id ?? null)

  const [activeTab, setActiveTab] = useState<Tab>('master')
  const [pageError, setPageError] = useState<string | null>(null)

  // ─── Sub-Hub view ─────────────────────────────────────────────────────────
  if (listId) {
    const currentList = hub.shoppingLists.find((l) => l.id === listId)
    const items = hub.itemsByListId[listId] ?? []
    const matchedContexts = currentList ? detectContext(currentList.name) : []

    async function handleAddItem(text: string): Promise<ShoppingItem | null> {
      try {
        const result = await hub.addItem(listId!, text)
        return result
      } catch {
        setPageError(tc('saveError'))
        return null
      }
    }

    async function handleInjectPack(itemTexts: string[]): Promise<void> {
      if (!listId) return
      setPageError(null)
      try {
        for (const text of itemTexts) {
          await hub.addItem(listId, text)
        }
      } catch {
        setPageError(tc('saveError'))
      }
    }

    async function handleReCategorize(item: ShoppingItem, category: ListCategory): Promise<void> {
      try {
        await hub.updateItem(item.id, { category })
        await hub.saveCustomMapping(item.text, category)
      } catch {
        setPageError(tc('saveError'))
      }
    }

    return (
      <div className="flex flex-col min-h-screen bg-(--color-background)">
        {/* Header */}
        <header className="bg-(--color-primary) px-4 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/shopping')}
            className="text-white/85 hover:text-white p-1 rounded-md transition-colors"
            aria-label={tc('back')}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M14 5l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white leading-tight truncate">
              {currentList?.name ?? t('hub.title')}
            </h1>
            <p className="text-xs text-white/70 mt-0.5">
              {t('subHub.items', { count: items.filter((i) => i.in_master).length })}
            </p>
          </div>
        </header>

        {/* Tab bar */}
        <div className="flex bg-(--color-surface) border-b border-(--color-muted)/15">
          <button
            type="button"
            onClick={() => setActiveTab('master')}
            className={[
              'flex-1 py-3 text-sm font-semibold transition-colors',
              activeTab === 'master'
                ? 'text-(--color-primary) border-b-2 border-(--color-primary)'
                : 'text-(--color-muted)',
            ].join(' ')}
          >
            {t('tabs.master')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={[
              'flex-1 py-3 text-sm font-semibold transition-colors',
              activeTab === 'active'
                ? 'text-(--color-primary) border-b-2 border-(--color-primary)'
                : 'text-(--color-muted)',
            ].join(' ')}
          >
            {t('tabs.active')}
          </button>
        </div>

        {/* Error banner */}
        {(pageError || hub.error) && (
          <div className="bg-(--color-error)/10 border-b border-(--color-error)/20 px-4 py-2">
            <p className="text-xs text-(--color-error)">{pageError ?? hub.error}</p>
          </div>
        )}

        {/* Tab content */}
        {hub.isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-(--color-muted)">{tc('loading')}</p>
          </div>
        ) : activeTab === 'master' ? (
          <div className="flex-1 flex flex-col relative">
            <MasterListView
              listId={listId}
              items={items}
              matchedContexts={matchedContexts}
              onAddItem={handleAddItem}
              onDeleteItem={hub.deleteItem}
              onDeleteItems={hub.deleteItems}
              onInjectPack={handleInjectPack}
              onReCategorize={handleReCategorize}
            />
          </div>
        ) : (
          <ActiveListView
            listId={listId}
            items={items}
            onToggleChecked={hub.toggleChecked}
            onClearSession={hub.clearSession}
          />
        )}
      </div>
    )
  }

  // ─── Main hub grid ────────────────────────────────────────────────────────
  return (
    <ShoppingHub
      shoppingLists={hub.shoppingLists}
      itemsByListId={hub.itemsByListId}
      isLoading={hub.isLoading}
      mutations={hub}
    />
  )
}
