/**
 * TaskModal — create/edit modal for tasks.
 *
 * Fields: title, description, status dropdown, urgency dropdown,
 *         is_urgent toggle, assignee dropdown, due_date picker, notes.
 * PRD §8.6
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BaseModal from '../../shared/BaseModal'
import {
  TASK_STATUSES,
  TASK_URGENCIES,
  validateTask,
  type Task,
  type TaskStatus,
  type TaskUrgency,
} from '../../../lib/tasks'
import type { UserProfile } from '../../../types/user'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (input: Partial<Task>) => Promise<void>
  onDelete?: () => Promise<void>
  task?: Task | null
  members: UserProfile[]
}

interface FormState {
  title: string
  description: string
  status: TaskStatus
  urgency: TaskUrgency
  is_urgent: boolean
  assignee_id: string
  due_date: string
  notes: string
}

function defaultForm(task?: Task | null): FormState {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? 'todo',
    urgency: task?.urgency ?? 'low',
    is_urgent: task?.is_urgent ?? false,
    assignee_id: task?.assignee_id ?? '',
    due_date: task?.due_date ?? '',
    notes: task?.notes ?? '',
  }
}

export default function TaskModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  task,
  members,
}: TaskModalProps) {
  const { t } = useTranslation('tasks')
  const { t: tc } = useTranslation('common')

  const [form, setForm] = useState<FormState>(defaultForm(task))
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [titleError, setTitleError] = useState(false)

  // Reset form when modal opens or task changes
  useEffect(() => {
    if (isOpen) {
      setForm(defaultForm(task))
      setTitleError(false)
    }
  }, [isOpen, task])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (key === 'title') setTitleError(false)
  }

  async function handleSave() {
    const validation = validateTask({
      title: form.title,
      status: form.status,
      urgency: form.urgency,
      due_date: form.due_date || null,
    })
    if (!validation.valid) {
      if (validation.errors.includes('title_required') || validation.errors.includes('title_too_long')) {
        setTitleError(true)
      }
      return
    }
    setIsSaving(true)
    try {
      await onSave({
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        urgency: form.urgency,
        is_urgent: form.is_urgent,
        assignee_id: form.assignee_id || null,
        due_date: form.due_date || null,
        notes: form.notes.trim() || null,
      })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete()
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  const isEditing = !!task

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t('modal.editTitle') : t('modal.createTitle')}
      footer={
        <div className="flex items-center gap-2 w-full">
          {isEditing && onDelete && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="text-sm font-medium text-[--color-error] hover:text-[--color-error]/80 transition-colors me-auto disabled:opacity-50"
            >
              {tc('delete')}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-md border border-[--color-muted]/30 text-sm font-semibold text-[--color-muted] hover:bg-[--color-muted]/5 transition-colors"
          >
            {tc('cancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="flex-1 py-2.5 rounded-md bg-[--color-primary] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSaving ? tc('loading') : isEditing ? t('modal.saveEdit') : t('modal.saveCreate')}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-[--color-muted] mb-1">
            {t('modal.titleLabel')} *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder={t('modal.titlePlaceholder')}
            maxLength={200}
            className={[
              'w-full rounded-md px-3 py-2.5 text-sm bg-[--color-background]',
              'border focus:outline-none focus:ring-1 transition-colors',
              titleError
                ? 'border-[--color-error] focus:ring-[--color-error]/30'
                : 'border-[--color-muted]/20 focus:border-[--color-primary] focus:ring-[--color-primary]/20',
            ].join(' ')}
          />
          {titleError && (
            <p className="mt-1 text-xs text-[--color-error]">{t('modal.titleLabel')} is required</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-[--color-muted] mb-1">
            {t('modal.descriptionLabel')}
          </label>
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder={t('modal.descriptionPlaceholder')}
            rows={2}
            className="w-full rounded-md px-3 py-2.5 text-sm bg-[--color-background] border border-[--color-muted]/20 focus:outline-none focus:border-[--color-primary] focus:ring-1 focus:ring-[--color-primary]/20 transition-colors resize-none"
          />
        </div>

        {/* Status + Urgency row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[--color-muted] mb-1">
              {t('modal.statusLabel')}
            </label>
            <select
              value={form.status}
              onChange={(e) => update('status', e.target.value as TaskStatus)}
              className="w-full rounded-md px-3 py-2.5 text-sm bg-[--color-background] border border-[--color-muted]/20 focus:outline-none focus:border-[--color-primary] focus:ring-1 focus:ring-[--color-primary]/20 transition-colors"
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>{t(`status.${s}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[--color-muted] mb-1">
              {t('modal.urgencyLabel')}
            </label>
            <select
              value={form.urgency}
              onChange={(e) => update('urgency', e.target.value as TaskUrgency)}
              className="w-full rounded-md px-3 py-2.5 text-sm bg-[--color-background] border border-[--color-muted]/20 focus:outline-none focus:border-[--color-primary] focus:ring-1 focus:ring-[--color-primary]/20 transition-colors"
            >
              {TASK_URGENCIES.map((u) => (
                <option key={u} value={u}>{t(`urgency.${u}`)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Is Urgent toggle */}
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium text-[#1a1a1a]">{t('modal.isUrgentLabel')}</p>
            <p className="text-xs text-[--color-muted]">{t('modal.isUrgentHint')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.is_urgent}
            onClick={() => update('is_urgent', !form.is_urgent)}
            className={[
              'relative w-11 h-6 rounded-full transition-colors',
              form.is_urgent ? 'bg-[--color-primary]' : 'bg-[--color-muted]/30',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-0.5 start-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                form.is_urgent ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')}
            />
          </button>
        </div>

        {/* Assignee */}
        <div>
          <label className="block text-xs font-medium text-[--color-muted] mb-1">
            {t('modal.assigneeLabel')}
          </label>
          <select
            value={form.assignee_id}
            onChange={(e) => update('assignee_id', e.target.value)}
            className="w-full rounded-md px-3 py-2.5 text-sm bg-[--color-background] border border-[--color-muted]/20 focus:outline-none focus:border-[--color-primary] focus:ring-1 focus:ring-[--color-primary]/20 transition-colors"
          >
            <option value="">{t('modal.assigneeNone')}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.display_name}</option>
            ))}
          </select>
        </div>

        {/* Due date */}
        <div>
          <label className="block text-xs font-medium text-[--color-muted] mb-1">
            {t('modal.dueDateLabel')}
          </label>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => update('due_date', e.target.value)}
            className="w-full rounded-md px-3 py-2.5 text-sm bg-[--color-background] border border-[--color-muted]/20 focus:outline-none focus:border-[--color-primary] focus:ring-1 focus:ring-[--color-primary]/20 transition-colors"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-[--color-muted] mb-1">
            {t('modal.notesLabel')}
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder={t('modal.notesPlaceholder')}
            rows={3}
            className="w-full rounded-md px-3 py-2.5 text-sm bg-[--color-background] border border-[--color-muted]/20 focus:outline-none focus:border-[--color-primary] focus:ring-1 focus:ring-[--color-primary]/20 transition-colors resize-none"
          />
        </div>
      </div>
    </BaseModal>
  )
}
