/**
 * TasksHubPage — route-level page for the Tasks Hub.
 *
 * Routes:
 *   /tasks           → main hub grid (TasksHub component)
 *   /tasks/urgent    → urgent tasks view (UrgentTasksView component)
 *   /tasks/:listId   → task list view with optional flashlight highlight
 *
 * Flashlight: reads `?flashlight=<taskId>` param and applies a pulsing glow
 * to the matching task element after render. §8.5
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSession } from '../contexts/AuthContext'
import { useTasksHub } from '../hooks/useTasksHub'
import { useUrgentTasks } from '../hooks/useUrgentTasks'
import TasksHub from '../components/hubs/tasks/TasksHub'
import UrgentTasksView from '../components/hubs/tasks/UrgentTasksView'
import TaskCard from '../components/hubs/tasks/TaskCard'
import TaskModal from '../components/hubs/tasks/TaskModal'
import BaseModal from '../components/shared/BaseModal'
import { applyFlashlightGlow } from '../components/hubs/tasks/FlashlightLink'
import { getDoneTaskIds, type Task } from '../lib/tasks'

export default function TasksHubPage() {
  const { id: listId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation('tasks')
  const { t: tc } = useTranslation('common')
  const { household } = useSession()

  const hub = useTasksHub(household?.id ?? null)
  const urgent = useUrgentTasks(household?.id ?? null)

  const [selectedTaskModal, setSelectedTaskModal] = useState<Task | null>(null)
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)

  // Handle flashlight deep-link (§8.5)
  const flashlightTaskId = searchParams.get('flashlight')
  useEffect(() => {
    if (!flashlightTaskId) return
    if (!hub.isLoading) {
      applyFlashlightGlow(flashlightTaskId)
    }
  }, [flashlightTaskId, hub.isLoading])

  // ─── Urgent Tasks virtual view ────────────────────────────────────────────
  if (listId === 'urgent') {
    return (
      <UrgentTasksView
        items={urgent.urgentItems}
        isLoading={urgent.isLoading}
        onBack={() => navigate('/tasks')}
      />
    )
  }

  // ─── Specific task list view ──────────────────────────────────────────────
  if (listId) {
    const currentList = hub.taskLists.find((l) => l.id === listId)
    const tasks = hub.tasksByListId[listId] ?? []
    const doneCount = getDoneTaskIds(tasks).length

    function toggleTaskSelect(taskId: string) {
      setSelectedTaskIds((prev) => {
        const next = new Set(prev)
        if (next.has(taskId)) next.delete(taskId)
        else next.add(taskId)
        return next
      })
    }

    async function handleToggleCompletion(task: Task) {
      const newStatus = task.status === 'done' ? 'todo' : 'done'
      try {
        await hub.updateTask(task.id, { status: newStatus })
      } catch {
        setPageError(tc('saveError'))
      }
    }

    async function handleSaveTask(input: Partial<Task>) {
      if (!listId) return
      setIsSaving(true)
      try {
        if (selectedTaskModal) {
          await hub.updateTask(selectedTaskModal.id, input)
        } else {
          await hub.createTask(listId, input)
        }
        setSelectedTaskModal(null)
        setShowCreateTaskModal(false)
      } catch {
        setPageError(tc('saveError'))
      } finally {
        setIsSaving(false)
      }
    }

    async function handleDeleteTask() {
      if (!selectedTaskModal) return
      try {
        await hub.deleteTask(selectedTaskModal.id)
        setSelectedTaskModal(null)
      } catch {
        setPageError(tc('deleteError'))
      }
    }

    async function handleBulkDeleteTasks() {
      const ids = [...selectedTaskIds]
      try {
        await hub.deleteTasks(ids)
        setSelectedTaskIds(new Set())
        setIsEditMode(false)
      } catch {
        setPageError(tc('deleteError'))
      }
    }

    async function handleClearCompleted() {
      if (!listId) return
      setIsSaving(true)
      try {
        await hub.clearCompleted(listId)
        setShowClearConfirm(false)
        setIsEditMode(false)
      } catch {
        setPageError(tc('deleteError'))
      } finally {
        setIsSaving(false)
      }
    }

    return (
      <div className="flex flex-col min-h-screen bg-(--color-background)">
        {/* Header */}
        <header className="bg-(--color-primary) px-4 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/tasks')}
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
              {t('subHub.tasks', { count: tasks.length })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsEditMode((p) => !p)
              setSelectedTaskIds(new Set())
            }}
            className="text-white/85 hover:text-white text-sm font-semibold px-3 py-1.5 rounded-md transition-colors"
          >
            {isEditMode ? t('hub.doneEditing') : t('hub.editMode')}
          </button>
        </header>

        {/* Edit mode toolbar */}
        {isEditMode && (
          <div className="bg-(--color-surface) border-b border-(--color-muted)/15 px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[#1a1a1a]">
              {t('editMode.selected', { count: selectedTaskIds.size })}
            </span>
            <div className="flex items-center gap-3">
              {doneCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="text-sm font-semibold text-(--color-muted) hover:text-[#1a1a1a] transition-colors"
                >
                  {t('editMode.clearCompleted')} ({doneCount})
                </button>
              )}
              {selectedTaskIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => void handleBulkDeleteTasks()}
                  className="text-sm font-semibold text-(--color-error)"
                >
                  {t('editMode.deleteSelected')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {(pageError || hub.error) && (
          <div className="bg-(--color-error)/10 border-b border-(--color-error)/20 px-4 py-2">
            <p className="text-xs text-(--color-error)">{pageError ?? hub.error}</p>
          </div>
        )}

        {/* Task list */}
        <main className="flex-1 pb-24">
          {hub.isLoading ? (
            <div className="py-16 text-center text-sm text-(--color-muted)">{tc('loading')}</div>
          ) : tasks.length === 0 ? (
            <div className="py-16 text-center">
              <span className="block text-3xl mb-3">✅</span>
              <p className="text-sm text-(--color-muted)">{t('hub.emptyState')}</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} data-task-id={task.id}>
                <TaskCard
                  task={task}
                  members={hub.members}
                  isSelected={selectedTaskIds.has(task.id)}
                  isEditMode={isEditMode}
                  onClick={isEditMode
                    ? () => toggleTaskSelect(task.id)
                    : (t) => { void handleToggleCompletion(t) }
                  }
                  onToggleSelect={toggleTaskSelect}
                />
              </div>
            ))
          )}
        </main>

        {/* FAB — add task */}
        {!isEditMode && (
          <button
            type="button"
            onClick={() => {
              setSelectedTaskModal(null)
              setShowCreateTaskModal(true)
            }}
            aria-label={t('modal.createTitle')}
            className="fixed bottom-24 end-4 w-14 h-14 rounded-full bg-(--color-primary) text-white shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {/* Create task modal */}
        <TaskModal
          isOpen={showCreateTaskModal && !selectedTaskModal}
          onClose={() => setShowCreateTaskModal(false)}
          onSave={handleSaveTask}
          members={hub.members}
        />

        {/* Edit task modal */}
        {selectedTaskModal && (
          <TaskModal
            isOpen={!!selectedTaskModal}
            onClose={() => setSelectedTaskModal(null)}
            onSave={handleSaveTask}
            onDelete={handleDeleteTask}
            task={selectedTaskModal}
            members={hub.members}
          />
        )}

        {/* Clear completed confirm */}
        <BaseModal
          isOpen={showClearConfirm}
          onClose={() => setShowClearConfirm(false)}
          title={t('editMode.clearCompleted')}
          footer={
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-md border border-(--color-muted)/30 text-sm font-semibold text-(--color-muted)"
              >
                {tc('cancel')}
              </button>
              <button
                type="button"
                onClick={() => void handleClearCompleted()}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-md bg-(--color-error) text-white text-sm font-semibold disabled:opacity-50"
              >
                {isSaving ? tc('loading') : tc('confirm')}
              </button>
            </div>
          }
        >
          <p className="text-sm text-(--color-muted)">
            {t('editMode.clearMessage', { count: doneCount })}
          </p>
        </BaseModal>
      </div>
    )
  }

  // ─── Main hub grid view (no listId) ──────────────────────────────────────
  return (
    <TasksHub
      taskLists={hub.taskLists}
      tasksByListId={hub.tasksByListId}
      urgentItems={urgent.urgentItems}
      isLoading={hub.isLoading}
      mutations={hub}
    />
  )
}
