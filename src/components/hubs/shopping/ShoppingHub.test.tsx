// @vitest-environment jsdom
/**
 * ShoppingHub component tests.
 * Covers: rendering, navigation, create/edit/delete sub-hubs, edit mode.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ShoppingHub from './ShoppingHub'
import type { ShoppingList, ShoppingItem } from '../../../types/shopping'
import type { ShoppingHubMutations } from '../../../hooks/useShoppingHub'
import type { ListCategory } from '../../../lib/autoCategorize'

// ─── jsdom dialog polyfill ────────────────────────────────────────────────────
// jsdom doesn't implement showModal/close on <dialog>; patch globally.
HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute('open', '')
})
HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute('open')
})

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'hub.title': 'Shopping',
        'hub.subtitle': `${opts?.['count'] ?? 0} list`,
        'hub.newSubHub': 'New list',
        'hub.emptyState': 'No shopping lists yet. Tap + to create one.',
        'hub.editMode': 'Edit',
        'hub.doneEditing': 'Done',
        'subHub.items': `${opts?.['count'] ?? 0} item`,
        'subHub.createTitle': 'New Shopping List',
        'subHub.createLabel': 'List name',
        'subHub.createPlaceholder': 'e.g. Supermarket',
        'subHub.editTitle': 'Edit List',
        'subHub.deleteConfirm': 'Delete List',
        'subHub.deleteMessage': 'This will permanently delete this list.',
        'editMode.selected': `${opts?.['count'] ?? 0} selected`,
        'editMode.deleteSelected': 'Delete Selected',
        'cancel': 'Cancel',
        'save': 'Save',
        'delete': 'Delete',
        'loading': 'Loading…',
        'saveError': 'Failed to save.',
        'deleteError': 'Failed to delete.',
        'close': 'Close',
        'back': 'Back',
        'confirm': 'Confirm',
      }
      return map[key] ?? key
    },
    i18n: { language: 'en' },
  }),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeList(overrides: Partial<ShoppingList> = {}): ShoppingList {
  return {
    id: 'list-1',
    household_id: 'hh-1',
    name: 'Supermarket',
    context: 'grocery',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

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

function makeMutations(overrides: Partial<ShoppingHubMutations> = {}): ShoppingHubMutations {
  return {
    createList: vi.fn().mockResolvedValue(makeList()),
    updateList: vi.fn().mockResolvedValue(undefined),
    deleteList: vi.fn().mockResolvedValue(undefined),
    addItem: vi.fn().mockResolvedValue(makeItem()),
    updateItem: vi.fn().mockResolvedValue(undefined),
    deleteItem: vi.fn().mockResolvedValue(undefined),
    deleteItems: vi.fn().mockResolvedValue(undefined),
    toggleChecked: vi.fn().mockResolvedValue(undefined),
    clearSession: vi.fn().mockResolvedValue(undefined),
    saveCustomMapping: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockNavigate.mockClear()
})

describe('ShoppingHub', () => {
  describe('rendering', () => {
    it('shows loading state', () => {
      render(
        <ShoppingHub
          shoppingLists={[]}
          itemsByListId={{}}
          isLoading
          mutations={makeMutations()}
        />,
      )
      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })

    it('shows empty state when no lists', () => {
      render(
        <ShoppingHub
          shoppingLists={[]}
          itemsByListId={{}}
          isLoading={false}
          mutations={makeMutations()}
        />,
      )
      expect(screen.getByText('No shopping lists yet. Tap + to create one.')).toBeInTheDocument()
    })

    it('renders sub-hub cards', () => {
      const list = makeList()
      render(
        <ShoppingHub
          shoppingLists={[list]}
          itemsByListId={{ [list.id]: [makeItem()] }}
          isLoading={false}
          mutations={makeMutations()}
        />,
      )
      expect(screen.getAllByTestId('subhub-card')).toHaveLength(1)
      expect(screen.getByText('Supermarket')).toBeInTheDocument()
    })

    it('shows item count badge on card', () => {
      const list = makeList()
      render(
        <ShoppingHub
          shoppingLists={[list]}
          itemsByListId={{ [list.id]: [makeItem(), makeItem({ id: 'item-2', text: 'Cheese' })] }}
          isLoading={false}
          mutations={makeMutations()}
        />,
      )
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  describe('navigation', () => {
    it('navigates to sub-hub view on card click', async () => {
      const user = userEvent.setup()
      const list = makeList({ id: 'list-abc' })
      render(
        <ShoppingHub
          shoppingLists={[list]}
          itemsByListId={{}}
          isLoading={false}
          mutations={makeMutations()}
        />,
      )
      await user.click(screen.getByTestId('subhub-card'))
      expect(mockNavigate).toHaveBeenCalledWith('/shopping/list-abc')
    })
  })

  describe('create list', () => {
    it('opens create modal on FAB click', async () => {
      const user = userEvent.setup()
      render(
        <ShoppingHub
          shoppingLists={[]}
          itemsByListId={{}}
          isLoading={false}
          mutations={makeMutations()}
        />,
      )
      await user.click(screen.getByLabelText('New list'))
      expect(screen.getByText('New Shopping List')).toBeInTheDocument()
    })

    it('calls createList on save', async () => {
      const user = userEvent.setup()
      const createList = vi.fn().mockResolvedValue(makeList({ name: 'Camping' }))
      render(
        <ShoppingHub
          shoppingLists={[]}
          itemsByListId={{}}
          isLoading={false}
          mutations={makeMutations({ createList })}
        />,
      )
      await user.click(screen.getByLabelText('New list'))
      await user.type(screen.getByRole('textbox'), 'Camping')
      await user.click(screen.getAllByText('Save')[0]!)
      expect(createList).toHaveBeenCalledWith('Camping')
    })
  })

  describe('edit mode', () => {
    it('shows edit/delete icons in edit mode', async () => {
      const user = userEvent.setup()
      const list = makeList()
      render(
        <ShoppingHub
          shoppingLists={[list]}
          itemsByListId={{}}
          isLoading={false}
          mutations={makeMutations()}
        />,
      )
      await user.click(screen.getByText('Edit'))
      expect(screen.getByLabelText('Edit List')).toBeInTheDocument()
      expect(screen.getByLabelText('Delete')).toBeInTheDocument()
    })

    it('selects card in edit mode instead of navigating', async () => {
      const user = userEvent.setup()
      const list = makeList()
      render(
        <ShoppingHub
          shoppingLists={[list]}
          itemsByListId={{}}
          isLoading={false}
          mutations={makeMutations()}
        />,
      )
      await user.click(screen.getByText('Edit'))
      await user.click(screen.getByTestId('subhub-card'))
      expect(mockNavigate).not.toHaveBeenCalled()
      expect(screen.getByText('1 selected')).toBeInTheDocument()
    })
  })
})
