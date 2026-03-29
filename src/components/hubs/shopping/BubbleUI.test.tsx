// @vitest-environment jsdom
/**
 * BubbleUI component tests.
 * Covers: bubble rendering, injection, smart merge, keep-empty.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import BubbleUI from './BubbleUI'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'bubbles.title': 'Start with a template?',
        'bubbles.keepEmpty': 'Keep Empty',
        'bubbles.keepEmptyHint': 'Start with a blank list',
      }
      return map[key] ?? key
    },
    i18n: { language: 'en' },
  }),
}))

describe('BubbleUI', () => {
  it('renders a bubble for each matched context', () => {
    render(
      <BubbleUI
        matchedContexts={['grocery', 'camping']}
        onInjectPack={vi.fn()}
        onKeepEmpty={vi.fn()}
      />,
    )
    expect(screen.getByTestId('bubble-grocery')).toBeInTheDocument()
    expect(screen.getByTestId('bubble-camping')).toBeInTheDocument()
  })

  it('renders Keep Empty bubble always', () => {
    render(
      <BubbleUI
        matchedContexts={[]}
        onInjectPack={vi.fn()}
        onKeepEmpty={vi.fn()}
      />,
    )
    expect(screen.getByTestId('bubble-keep-empty')).toBeInTheDocument()
  })

  it('calls onInjectPack with starter pack items when bubble clicked', async () => {
    const user = userEvent.setup()
    const onInjectPack = vi.fn()
    render(
      <BubbleUI
        matchedContexts={['grocery']}
        onInjectPack={onInjectPack}
        onKeepEmpty={vi.fn()}
      />,
    )
    await user.click(screen.getByTestId('bubble-grocery'))
    expect(onInjectPack).toHaveBeenCalledOnce()
    const items: string[] = onInjectPack.mock.calls[0][0]
    expect(items.length).toBeGreaterThan(0)
    // Grocery pack includes Milk
    expect(items).toContain('Milk')
  })

  it('smart merge: clicking two bubbles accumulates items without duplicates', async () => {
    const user = userEvent.setup()
    const calls: string[][] = []
    const onInjectPack = vi.fn((items: string[]) => calls.push(items))
    render(
      <BubbleUI
        matchedContexts={['grocery', 'pharma']}
        onInjectPack={onInjectPack}
        onKeepEmpty={vi.fn()}
      />,
    )
    await user.click(screen.getByTestId('bubble-grocery'))
    await user.click(screen.getByTestId('bubble-pharma'))

    // Second call should have all items from both packs
    const finalItems = calls[calls.length - 1]!
    // No duplicates
    const normalized = finalItems.map((s) => s.toLowerCase().trim())
    const unique = new Set(normalized)
    expect(unique.size).toBe(normalized.length)
    // Has items from both packs
    expect(finalItems).toContain('Milk') // grocery
    expect(finalItems).toContain('Paracetamol') // pharma
  })

  it('calls onKeepEmpty when Keep Empty clicked', async () => {
    const user = userEvent.setup()
    const onKeepEmpty = vi.fn()
    render(
      <BubbleUI
        matchedContexts={['grocery']}
        onInjectPack={vi.fn()}
        onKeepEmpty={onKeepEmpty}
      />,
    )
    await user.click(screen.getByTestId('bubble-keep-empty'))
    expect(onKeepEmpty).toHaveBeenCalledOnce()
  })

  it('shows checkmark on bubble after injection', async () => {
    const user = userEvent.setup()
    render(
      <BubbleUI
        matchedContexts={['grocery']}
        onInjectPack={vi.fn()}
        onKeepEmpty={vi.fn()}
      />,
    )
    const bubble = screen.getByTestId('bubble-grocery')
    expect(bubble).not.toHaveTextContent('✓')
    await user.click(bubble)
    expect(bubble).toHaveTextContent('✓')
  })
})
