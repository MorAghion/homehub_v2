// @vitest-environment jsdom
/**
 * VoucherModal component tests.
 * Covers: form rendering, save/cancel, Smart Paste detection, delete confirm.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import VoucherModal from './VoucherModal'
import type { Voucher } from '../../../types/vouchers'

// ─── i18n mock ────────────────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => ({
    t: (key: string) => {
      const all: Record<string, string> = {
        'modal.createTitle': 'New Voucher',
        'modal.editTitle': 'Edit Voucher',
        'modal.nameLabel': 'Name',
        'modal.namePlaceholder': 'e.g. Zara Gift Card',
        'modal.valueLabel': 'Value',
        'modal.valuePlaceholder': 'e.g. ₪500',
        'modal.codeLabel': 'Code / Barcode',
        'modal.codePlaceholder': 'Paste code or BuyMe URL',
        'modal.expiryLabel': 'Expiry Date',
        'modal.notesLabel': 'Notes',
        'modal.notesPlaceholder': 'Optional notes…',
        'modal.imageLabel': 'Image',
        'modal.imageUpload': 'Upload image',
        'modal.ocrRunning': 'Scanning image for code…',
        'modal.ocrFound': 'Code extracted from image',
        'modal.smartPasteDetected': 'BuyMe link detected — fields auto-filled',
        'modal.saveCreate': 'Add Voucher',
        'modal.saveEdit': 'Save Changes',
        'modal.deleteConfirm': 'Delete Voucher',
        'modal.deleteMessage': 'Are you sure you want to delete this voucher?',
        'cancel': 'Cancel',
        'save': 'Save',
        'delete': 'Delete',
        'confirm': 'Confirm',
        'close': 'Close',
        'loading': 'Loading…',
        'saveError': 'Failed to save. Please try again.',
        'deleteError': 'Failed to delete. Please try again.',
      }
      return all[key] ?? key
    },
    i18n: { language: 'en' },
  }),
}))

// ─── dialog mock ──────────────────────────────────────────────────────────────
// jsdom doesn't implement showModal/close on <dialog>
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false
  })
})

// ─── Fixture ──────────────────────────────────────────────────────────────────
function makeVoucher(overrides: Partial<Voucher> = {}): Voucher {
  return {
    id: 'v-1',
    household_id: 'hh-1',
    name: 'Existing Voucher',
    value: '₪200',
    issuer: null,
    expiry_date: '2027-06-15',
    code: 'EXIST123',
    image_url: null,
    notes: 'Some notes',
    list_id: 'list-1',
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('VoucherModal', () => {
  describe('create mode', () => {
    it('renders create title', () => {
      render(<VoucherModal isOpen onClose={vi.fn()} onSave={vi.fn()} />)
      expect(screen.getByText('New Voucher')).toBeInTheDocument()
    })

    it('renders all fields', () => {
      render(<VoucherModal isOpen onClose={vi.fn()} onSave={vi.fn()} />)
      expect(screen.getByPlaceholderText('e.g. Zara Gift Card')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('e.g. ₪500')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Paste code or BuyMe URL')).toBeInTheDocument()
    })

    it('save button disabled when name is empty', () => {
      render(<VoucherModal isOpen onClose={vi.fn()} onSave={vi.fn()} />)
      expect(screen.getByRole('button', { name: 'Add Voucher' })).toBeDisabled()
    })

    it('save button enabled after entering name', async () => {
      const user = userEvent.setup()
      render(<VoucherModal isOpen onClose={vi.fn()} onSave={vi.fn()} />)
      await user.type(screen.getByPlaceholderText('e.g. Zara Gift Card'), 'My Voucher')
      expect(screen.getByRole('button', { name: 'Add Voucher' })).toBeEnabled()
    })

    it('calls onSave with correct data', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn().mockResolvedValue(undefined)
      render(<VoucherModal isOpen onClose={vi.fn()} onSave={onSave} />)

      await user.type(screen.getByPlaceholderText('e.g. Zara Gift Card'), 'Test Voucher')
      await user.type(screen.getByPlaceholderText('e.g. ₪500'), '₪100')
      await user.click(screen.getByRole('button', { name: 'Add Voucher' }))

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Test Voucher', value: '₪100' }),
          undefined,
        )
      })
    })

    it('calls onClose when cancel is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<VoucherModal isOpen onClose={onClose} onSave={vi.fn()} />)
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onClose).toHaveBeenCalledOnce()
    })
  })

  describe('edit mode', () => {
    it('renders edit title', () => {
      render(<VoucherModal isOpen onClose={vi.fn()} onSave={vi.fn()} voucher={makeVoucher()} />)
      expect(screen.getByText('Edit Voucher')).toBeInTheDocument()
    })

    it('pre-fills form with existing voucher data', () => {
      render(<VoucherModal isOpen onClose={vi.fn()} onSave={vi.fn()} voucher={makeVoucher()} />)
      expect(screen.getByDisplayValue('Existing Voucher')).toBeInTheDocument()
      expect(screen.getByDisplayValue('₪200')).toBeInTheDocument()
      expect(screen.getByDisplayValue('EXIST123')).toBeInTheDocument()
    })

    it('shows delete button in edit mode', () => {
      render(
        <VoucherModal
          isOpen
          onClose={vi.fn()}
          onSave={vi.fn()}
          onDelete={vi.fn()}
          voucher={makeVoucher()}
        />,
      )
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    })

    it('shows delete confirmation when delete clicked', async () => {
      const user = userEvent.setup()
      render(
        <VoucherModal
          isOpen
          onClose={vi.fn()}
          onSave={vi.fn()}
          onDelete={vi.fn()}
          voucher={makeVoucher()}
        />,
      )
      await user.click(screen.getByRole('button', { name: 'Delete' }))
      expect(screen.getByText('Are you sure you want to delete this voucher?')).toBeInTheDocument()
    })
  })

  describe('Smart Paste', () => {
    it('detects BuyMe URL on paste into code field and shows notification', async () => {
      const user = userEvent.setup()
      render(<VoucherModal isOpen onClose={vi.fn()} onSave={vi.fn()} />)

      const codeInput = screen.getByPlaceholderText('Paste code or BuyMe URL')

      // Paste BuyMe URL via userEvent clipboard paste
      await user.click(codeInput)
      await user.paste('https://www.buyme.co.il/gift/ABCD1234')

      await waitFor(() => {
        expect(
          screen.getByText('BuyMe link detected — fields auto-filled'),
        ).toBeInTheDocument()
      })
    })
  })
})
