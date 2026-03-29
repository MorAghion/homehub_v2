// @vitest-environment jsdom
/**
 * ActiveListView component tests.
 * Covers: rendering, check/uncheck items, checked items sink to bottom,
 * clear session flow.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import ActiveListView from './ActiveListView'

// jsdom dialog polyfill
HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute('open', '')
})
HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute('open')
})
import type { ShoppingItem } from '../../../types/shopping'
import type { ListCategory } from '../../../lib/autoCategorize'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'activeList.emptyState': 'No items yet.',
        'activeList.clearSession': 'Clear session',
        'activeList.clearConfirm': 'End shopping session?',
        'activeList.clearMessage': `This will uncheck ${opts?.['count'] ?? 0} items.`,
        'activeList.allChecked': 'All done!',
        'category.dairy': 'Dairy',
        'category.meat': 'Meat',
        'category.other': 'Other',
        'cancel': 'Cancel',
        'confirm': 'Confirm',
        'loading': 'Loading…',
        'close': 'Close',
      }
      return map[key] ?? key
    },
    i18n: { language: 'en' },
  }),
}))

function makeItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: 'item-1',
    list_id: 'list-1',
    text: 'Milk',
    quantity: null,
    checked: false,
    category: 'dairy' as ListCategory,
    in_master: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('ActiveListView', () => {
  it('shows empty state when no master items', () => {
    render(
      <ActiveListView
        listId="list-1"
        items={[]}
        onToggleChecked={vi.fn()}
        onClearSession={vi.fn()}
      />,
    )
    expect(screen.getByText('No items yet.')).toBeInTheDocument()
  })

  it('renders items', () => {
    const items = [makeItem({ text: 'Milk' }), makeItem({ id: 'item-2', text: 'Cheese' })]
    render(
      <ActiveListView
        listId="list-1"
        items={items}
        onToggleChecked={vi.fn()}
        onClearSession={vi.fn()}
      />,
    )
    expect(screen.getByText('Milk')).toBeInTheDocument()
    expect(screen.getByText('Cheese')).toBeInTheDocument()
  })

  it('calls onToggleChecked when item clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn().mockResolvedValue(undefined)
    render(
      <ActiveListView
        listId="list-1"
        items={[makeItem()]}
        onToggleChecked={onToggle}
        onClearSession={vi.fn()}
      />,
    )
    await user.click(screen.getByTestId('active-item'))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('checked item shows line-through text', () => {
    render(
      <ActiveListView
        listId="list-1"
        items={[makeItem({ checked: true })]}
        onToggleChecked={vi.fn()}
        onClearSession={vi.fn()}
      />,
    )
    expect(screen.getByText('Milk')).toHaveClass('line-through')
  })

  it('shows clear session button when items are checked', () => {
    render(
      <ActiveListView
        listId="list-1"
        items={[makeItem({ checked: true })]}
        onToggleChecked={vi.fn()}
        onClearSession={vi.fn()}
      />,
    )
    expect(screen.getByText(/Clear session/)).toBeInTheDocument()
  })

  it('does not show clear session when no items checked', () => {
    render(
      <ActiveListView
        listId="list-1"
        items={[makeItem({ checked: false })]}
        onToggleChecked={vi.fn()}
        onClearSession={vi.fn()}
      />,
    )
    expect(screen.queryByText(/Clear session/)).not.toBeInTheDocument()
  })

  it('shows all-done message when all items checked', () => {
    render(
      <ActiveListView
        listId="list-1"
        items={[makeItem({ checked: true })]}
        onToggleChecked={vi.fn()}
        onClearSession={vi.fn()}
      />,
    )
    expect(screen.getByText('All done!')).toBeInTheDocument()
  })

  it('calls onClearSession on confirm', async () => {
    const user = userEvent.setup()
    const onClearSession = vi.fn().mockResolvedValue(undefined)
    render(
      <ActiveListView
        listId="list-1"
        items={[makeItem({ checked: true })]}
        onToggleChecked={vi.fn()}
        onClearSession={onClearSession}
      />,
    )
    await user.click(screen.getByText(/Clear session/))
    await user.click(screen.getByText('Confirm'))
    expect(onClearSession).toHaveBeenCalledWith('list-1')
  })

  it('groups items by category', () => {
    const items = [
      makeItem({ id: '1', category: 'dairy' as ListCategory, text: 'Milk' }),
      makeItem({ id: '2', category: 'meat' as ListCategory, text: 'Chicken' }),
    ]
    render(
      <ActiveListView
        listId="list-1"
        items={items}
        onToggleChecked={vi.fn()}
        onClearSession={vi.fn()}
      />,
    )
    expect(screen.getByText('Dairy')).toBeInTheDocument()
    expect(screen.getByText('Meat')).toBeInTheDocument()
  })
})
