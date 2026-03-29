// @vitest-environment jsdom
/**
 * VoucherCard component tests.
 * Covers: name/value rendering, code copy, expiry color-coding, edit mode.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import VoucherCard from './VoucherCard'
import type { Voucher } from '../../../types/vouchers'

// ─── i18n mock ────────────────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'card.copyCode': 'Copy code',
        'card.codeCopied': 'Code copied!',
        'card.noCode': 'No code',
        'card.expired': 'Expired',
        'card.expiresIn': `Expires in ${opts?.['days'] ?? 0} days`,
        'card.expiresLabel': 'Expires',
        'card.noExpiry': 'No expiry',
        'card.imageAlt': 'Voucher image',
      }
      return map[key] ?? key
    },
    i18n: { language: 'en' },
  }),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────
function makeVoucher(overrides: Partial<Voucher> = {}): Voucher {
  return {
    id: 'v-1',
    household_id: 'hh-1',
    name: 'Zara Gift Card',
    value: '₪500',
    issuer: 'Zara',
    expiry_date: null,
    code: 'ZARA1234',
    image_url: null,
    notes: null,
    list_id: 'list-1',
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('VoucherCard', () => {

  describe('rendering', () => {
    it('renders voucher name', () => {
      render(<VoucherCard voucher={makeVoucher()} onClick={vi.fn()} />)
      expect(screen.getByText('Zara Gift Card')).toBeInTheDocument()
    })

    it('renders voucher value', () => {
      render(<VoucherCard voucher={makeVoucher()} onClick={vi.fn()} />)
      expect(screen.getByText('₪500')).toBeInTheDocument()
    })

    it('renders code when present', () => {
      render(<VoucherCard voucher={makeVoucher({ code: 'TESTCODE99' })} onClick={vi.fn()} />)
      expect(screen.getByText('TESTCODE99')).toBeInTheDocument()
    })

    it('shows "No code" when code is null', () => {
      render(<VoucherCard voucher={makeVoucher({ code: null })} onClick={vi.fn()} />)
      expect(screen.getByText('No code')).toBeInTheDocument()
    })

    it('shows "No expiry" when expiry_date is null', () => {
      render(<VoucherCard voucher={makeVoucher({ expiry_date: null })} onClick={vi.fn()} />)
      expect(screen.getByText('No expiry')).toBeInTheDocument()
    })

    it('shows "Expired" for past expiry dates', () => {
      render(<VoucherCard voucher={makeVoucher({ expiry_date: '2020-01-01' })} onClick={vi.fn()} />)
      expect(screen.getByTestId('expiry-label')).toHaveTextContent('Expired')
    })

    it('shows days remaining for expiry within 7 days', () => {
      const soon = new Date()
      soon.setUTCDate(soon.getUTCDate() + 3)
      const dateStr = soon.toISOString().slice(0, 10)
      render(<VoucherCard voucher={makeVoucher({ expiry_date: dateStr })} onClick={vi.fn()} />)
      expect(screen.getByTestId('expiry-label')).toHaveTextContent('Expires in 3 days')
    })

    it('shows full date for expiry far in future', () => {
      render(<VoucherCard voucher={makeVoucher({ expiry_date: '2099-12-31' })} onClick={vi.fn()} />)
      expect(screen.getByTestId('expiry-label')).toHaveTextContent('Expires:')
    })

    it('renders image when image_url is present', () => {
      render(
        <VoucherCard voucher={makeVoucher({ image_url: 'https://example.com/img.jpg' })} onClick={vi.fn()} />,
      )
      expect(screen.getByAltText('Voucher image')).toBeInTheDocument()
    })

    it('renders placeholder when no image', () => {
      render(<VoucherCard voucher={makeVoucher({ image_url: null })} onClick={vi.fn()} />)
      expect(screen.queryByAltText('Voucher image')).not.toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onClick when card is clicked (non-edit mode)', async () => {
      // Use writeToClipboard: false to avoid userEvent clipboard setup conflict
      const user = userEvent.setup({ writeToClipboard: false })
      const onClick = vi.fn()
      render(<VoucherCard voucher={makeVoucher()} onClick={onClick} />)
      await user.click(screen.getByTestId('voucher-card'))
      expect(onClick).toHaveBeenCalledOnce()
      expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'v-1' }))
    })

    it('copy button is present when code exists', () => {
      render(<VoucherCard voucher={makeVoucher({ code: 'COPYTEST' })} onClick={vi.fn()} />)
      expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument()
    })

    it('does not call card onClick when copy button is clicked', async () => {
      const { fireEvent: fe } = await import('@testing-library/react')
      const onClick = vi.fn()
      render(<VoucherCard voucher={makeVoucher()} onClick={onClick} />)
      const copyBtn = screen.getByRole('button', { name: 'Copy code' })
      fe.click(copyBtn)
      expect(onClick).not.toHaveBeenCalled()
    })

    it('in edit mode: calls onToggleSelect instead of onClick', async () => {
      const user = userEvent.setup({ writeToClipboard: false })
      const onClick = vi.fn()
      const onToggleSelect = vi.fn()
      render(
        <VoucherCard
          voucher={makeVoucher()}
          onClick={onClick}
          isEditMode
          onToggleSelect={onToggleSelect}
        />,
      )
      await user.click(screen.getByTestId('voucher-card'))
      expect(onToggleSelect).toHaveBeenCalledWith('v-1')
      expect(onClick).not.toHaveBeenCalled()
    })

    it('shows checkbox in edit mode', () => {
      render(
        <VoucherCard voucher={makeVoucher()} onClick={vi.fn()} isEditMode />,
      )
      const card = screen.getByTestId('voucher-card')
      expect(card.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
    })

    it('selected card has aria-pressed=true in edit mode', () => {
      render(
        <VoucherCard voucher={makeVoucher()} onClick={vi.fn()} isEditMode isSelected />,
      )
      expect(screen.getByTestId('voucher-card')).toHaveAttribute('aria-pressed', 'true')
    })
  })
})
