/**
 * SettingsPage — PRD §11.1
 *
 * Sections:
 *   - User card (avatar, name, email, role badge)
 *   - Appearance: Theme toggle (Burgundy/Mint) + Language toggle (EN/HE)
 *   - Integrations: Gmail connect / disconnect
 *   - Household: Invite Partner (owner only) + Members list
 *   - Account: Sign Out
 *   - Danger Zone: Delete Account + Delete Household (owner only)
 *
 * All theme changes write to localStorage key "homehub-theme" and update the
 * <html> class. All language changes update the <html> dir + lang attributes
 * and i18next language without a page reload.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import BaseModal from '../components/shared/BaseModal'
import { useSettings, type GeneratedInviteCode } from '../hooks/useSettings'
import type { HouseholdMember } from '../types/user'

// ---------------------------------------------------------------------------
// Theme helpers
// ---------------------------------------------------------------------------

const THEME_KEY = 'homehub-theme' as const
type Theme = 'burgundy' | 'mint'

function getStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY)
  return stored === 'mint' ? 'mint' : 'burgundy'
}

function applyTheme(theme: Theme) {
  const html = document.documentElement
  html.classList.remove('theme-burgundy', 'theme-mint')
  html.classList.add(`theme-${theme}`)
  localStorage.setItem(THEME_KEY, theme)
}

// ---------------------------------------------------------------------------
// Language helpers
// ---------------------------------------------------------------------------

function applyLanguage(lang: 'en' | 'he', i18n: { changeLanguage: (l: string) => void }) {
  const html = document.documentElement
  html.setAttribute('lang', lang)
  html.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr')
  i18n.changeLanguage(lang)
}

// ---------------------------------------------------------------------------
// Invite code expiry countdown helper
// ---------------------------------------------------------------------------

function formatExpiry(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return ''
  const totalMinutes = Math.floor(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${String(minutes)}m`
  return `${String(hours)}h ${String(minutes)}m`
}

// ---------------------------------------------------------------------------
// Avatar helper — first initial of display name
// ---------------------------------------------------------------------------

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase()
}

// ---------------------------------------------------------------------------
// Avatar colour palette (index into member list for stable colours)
// ---------------------------------------------------------------------------

const AVATAR_COLORS = [
  'bg-(--color-primary)',
  '#1E40AF',
  '#6D28D9',
  '#065F46',
] as const

function avatarColorClass(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length] as string
}

// ---------------------------------------------------------------------------
// SettingsPage
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const { t, i18n } = useTranslation(['settings', 'common'])
  const navigate = useNavigate()

  const {
    profile,
    household,
    members,
    gmail,
    isLoading,
    error,
    generateInviteCode,
    connectGmail,
    disconnectGmail,
    transferOwnership,
    deleteAccount,
    deleteHousehold,
    signOut,
  } = useSettings()

  // Theme state — initialised from localStorage
  const [theme, setTheme] = useState<Theme>(getStoredTheme)

  // Language state — initialised from i18n
  const [lang, setLang] = useState<'en' | 'he'>(
    i18n.language?.startsWith('he') ? 'he' : 'en',
  )

  // Invite code state
  const [inviteCode, setInviteCode] = useState<GeneratedInviteCode | null>(null)
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)

  // Modal open states
  const [signOutModalOpen, setSignOutModalOpen] = useState(false)
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false)
  const [deleteHouseholdModalOpen, setDeleteHouseholdModalOpen] = useState(false)
  const [transferOwnerModalOpen, setTransferOwnerModalOpen] = useState(false)

  // Delete confirmation inputs
  const [deleteAccountInput, setDeleteAccountInput] = useState('')
  const [deleteHouseholdInput, setDeleteHouseholdInput] = useState('')

  // Transfer ownership selection
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>('')

  // In-flight states
  const [isDeleting, setIsDeleting] = useState(false)
  const [gmailLoading, setGmailLoading] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleThemeToggle() {
    const next: Theme = theme === 'burgundy' ? 'mint' : 'burgundy'
    applyTheme(next)
    setTheme(next)
  }

  function handleLanguageToggle() {
    const next = lang === 'en' ? 'he' : 'en'
    applyLanguage(next, i18n)
    setLang(next)
  }

  async function handleGenerateInvite() {
    setIsGeneratingInvite(true)
    setMutationError(null)
    try {
      const result = await generateInviteCode()
      setInviteCode(result)
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : t('common:error'))
    } finally {
      setIsGeneratingInvite(false)
    }
  }

  async function handleCopyInviteCode() {
    if (!inviteCode) return
    await navigator.clipboard.writeText(inviteCode.code)
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }

  async function handleGmailConnect() {
    setGmailLoading(true)
    setMutationError(null)
    try {
      await connectGmail()
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : t('common:error'))
    } finally {
      setGmailLoading(false)
    }
  }

  async function handleGmailDisconnect() {
    setGmailLoading(true)
    setMutationError(null)
    try {
      await disconnectGmail()
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : t('common:error'))
    } finally {
      setGmailLoading(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/auth')
  }

  function handleDeleteAccountClick() {
    // Owner with other members → must transfer ownership first
    if (profile?.role === 'owner' && members.length > 1) {
      setTransferOwnerModalOpen(true)
    } else {
      setDeleteAccountInput('')
      setDeleteAccountModalOpen(true)
    }
  }

  async function handleTransferAndDelete() {
    if (!selectedNewOwner) return
    setIsDeleting(true)
    setMutationError(null)
    try {
      await transferOwnership(selectedNewOwner)
      setTransferOwnerModalOpen(false)
      setDeleteAccountInput('')
      setDeleteAccountModalOpen(true)
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : t('common:error'))
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleConfirmDeleteAccount() {
    if (deleteAccountInput !== t('settings:deleteAccount.confirmWord')) return
    setIsDeleting(true)
    setMutationError(null)
    try {
      await deleteAccount()
      navigate('/auth')
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : t('common:error'))
      setIsDeleting(false)
    }
  }

  async function handleConfirmDeleteHousehold() {
    if (deleteHouseholdInput !== t('settings:deleteHousehold.confirmWord')) return
    setIsDeleting(true)
    setMutationError(null)
    try {
      await deleteHousehold()
      navigate('/auth')
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : t('common:error'))
      setIsDeleting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Loading / error state
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-(--color-background)"
        data-testid="settings-page"
      >
        <p className="text-sm text-(--color-muted)">{t('common:loading')}</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-(--color-background)"
        data-testid="settings-page"
      >
        <p className="text-sm text-(--color-error)">{error ?? t('common:error')}</p>
      </div>
    )
  }

  const isOwner = profile.role === 'owner'
  const otherMembers = members.filter((m) => m.id !== profile.id)

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function renderUserCard() {
    return (
      <div className="mx-4 mt-4 rounded-xl bg-(--color-surface) p-4 shadow-sm flex items-center gap-3.5">
        <div
          className="size-[52px] rounded-full bg-(--color-primary) flex items-center justify-center text-white text-xl font-bold shrink-0"
          aria-hidden="true"
        >
          {getInitial(profile!.display_name)}
        </div>
        <div>
          <p className="text-[17px] font-bold text-[#1a1a1a]">{profile!.display_name}</p>
          <p className="text-[13px] text-(--color-muted) mt-0.5">
            {/* Email comes from auth.users — available via the members list */}
            {members.find((m) => m.id === profile!.id)?.email ?? ''}
          </p>
          <span className="inline-block mt-1 rounded-sm bg-(--color-primary)/8 px-1.5 py-0.5 text-[11px] font-bold text-(--color-primary)">
            {isOwner
              ? t('settings:householdInfo.owner')
              : t('settings:householdInfo.member')}
          </span>
        </div>
      </div>
    )
  }

  function renderAppearanceSection() {
    const themeLabel =
      theme === 'burgundy'
        ? t('settings:theme.burgundy')
        : t('settings:theme.mint')

    return (
      <div className="mx-4 mt-4">
        <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-[0.5px] text-(--color-muted)">
          {t('settings:sections.appearance')}
        </p>
        <div className="rounded-xl bg-(--color-surface) overflow-hidden shadow-sm">
          {/* Theme toggle */}
          <SettingsRow
            icon="🎨"
            iconBg="bg-(--color-primary)/8"
            label={t('settings:theme.label')}
            sublabel={t('settings:theme.sublabel', { active: themeLabel })}
            action={
              <Toggle
                on={theme === 'mint'}
                onChange={handleThemeToggle}
                data-testid="theme-toggle"
                aria-label={t('settings:theme.mint')}
              />
            }
          />
          {/* Language toggle */}
          <SettingsRow
            icon="🌐"
            iconBg="bg-blue-700/8"
            label={t('settings:language.label')}
            sublabel={
              lang === 'en'
                ? t('settings:language.sublabelEn')
                : t('settings:language.sublabelHe')
            }
            action={
              <Toggle
                on={lang === 'he'}
                onChange={handleLanguageToggle}
                data-testid="language-toggle"
                aria-label={t('settings:language.hebrew')}
              />
            }
            isLast
          />
        </div>
      </div>
    )
  }

  function renderIntegrationsSection() {
    return (
      <div className="mx-4 mt-4">
        <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-[0.5px] text-(--color-muted)">
          {t('settings:sections.integrations')}
        </p>
        <div className="rounded-xl bg-(--color-surface) overflow-hidden shadow-sm">
          <SettingsRow
            icon="📧"
            iconBg="bg-red-500/8"
            label={t('settings:gmail.label')}
            sublabel={
              gmail.connected && gmail.email
                ? t('settings:gmail.connectedAs', { email: gmail.email })
                : undefined
            }
            action={
              gmail.connected ? (
                <button
                  type="button"
                  onClick={handleGmailDisconnect}
                  disabled={gmailLoading}
                  className="rounded-full bg-(--color-success)/10 px-2.5 py-0.5 text-xs font-semibold text-(--color-success)"
                >
                  {t('settings:gmail.connected')}
                </button>
              ) : (
                <span className="rounded-full bg-(--color-muted)/15 px-2.5 py-0.5 text-xs font-semibold text-(--color-muted)">
                  {t('settings:gmail.notConnected')}
                </span>
              )
            }
            onClick={gmail.connected ? handleGmailDisconnect : handleGmailConnect}
            isLast
          />
        </div>
      </div>
    )
  }

  function renderHouseholdSection() {
    return (
      <div className="mx-4 mt-4">
        <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-[0.5px] text-(--color-muted)">
          {t('settings:sections.household')}
        </p>
        <div className="rounded-xl bg-(--color-surface) overflow-hidden shadow-sm">
          {/* Invite Partner */}
          {isOwner && (
            <div>
              <SettingsRow
                icon="🔗"
                iconBg="bg-(--color-success)/8"
                label={t('settings:invite.label')}
                sublabel={t('settings:invite.sublabel')}
                onClick={inviteCode ? undefined : handleGenerateInvite}
                action={
                  inviteCode ? undefined : (
                    <ChevronIcon />
                  )
                }
                isLoading={isGeneratingInvite}
              />
              {inviteCode && (
                <div className="px-4 pb-4">
                  <p className="mb-2.5 text-[13px] font-semibold text-(--color-success)">
                    {t('settings:invite.generated')}
                  </p>
                  <div className="rounded-[10px] border-[1.5px] border-(--color-success)/25 bg-(--color-success)/6 flex flex-col items-center gap-2.5 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.4px] text-(--color-success)">
                      {t('settings:invite.yourCode')}
                    </p>
                    <p
                      className="font-mono text-[28px] font-extrabold tracking-[6px] text-[#1a1a1a]"
                      data-testid="invite-code"
                    >
                      {inviteCode.code}
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyInviteCode}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-(--color-success) px-0 py-2.5 text-sm font-semibold text-white active:opacity-85"
                    >
                      <CopyIcon />
                      {inviteCopied
                        ? t('settings:invite.copied')
                        : t('settings:invite.copy')}
                    </button>
                    <p className="flex items-center gap-1.5 text-xs text-(--color-muted)">
                      <ClockIcon />
                      {formatExpiry(inviteCode.expiresAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Household Members */}
          <div>
            <div className="flex items-center gap-3.5 px-4 pb-2.5 pt-3.5 border-t border-(--color-muted)/12">
              <div
                className="size-[34px] rounded-lg flex items-center justify-center text-lg bg-(--color-muted)/10 shrink-0"
                aria-hidden="true"
              >
                🏠
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-[#1a1a1a]">
                  {t('settings:householdInfo.label')}
                </p>
                {household && (
                  <p className="text-xs text-(--color-muted) mt-0.5">{household.name}</p>
                )}
              </div>
            </div>
            <div data-testid="household-members" aria-label={t('settings:householdInfo.label')}>
              {members.map((member, idx) => (
                <MemberRow key={member.id} member={member} index={idx} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderAccountSection() {
    return (
      <div className="mx-4 mt-4">
        <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-[0.5px] text-(--color-muted)">
          {t('settings:sections.account')}
        </p>
        <div className="rounded-xl bg-(--color-surface) overflow-hidden shadow-sm">
          <SettingsRow
            icon="🚪"
            iconBg="bg-(--color-muted)/10"
            label={t('settings:signOut.label')}
            onClick={() => setSignOutModalOpen(true)}
            action={<ChevronIcon />}
            isLast
          />
        </div>
      </div>
    )
  }

  function renderDangerZone() {
    return (
      <div className="mx-4 mt-4 mb-10">
        <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-[0.5px] text-(--color-error)">
          ⚠️ {t('settings:sections.dangerZone')}
        </p>
        <div className="rounded-xl border border-red-200 bg-red-50 overflow-hidden">
          <DangerRow
            icon="🗑️"
            label={t('settings:deleteAccount.label')}
            sublabel={t('settings:deleteAccount.sublabel')}
            onClick={handleDeleteAccountClick}
          />
          {isOwner && (
            <DangerRow
              icon="💥"
              label={t('settings:deleteHousehold.label')}
              sublabel={t('settings:deleteHousehold.sublabel')}
              onClick={() => {
                setDeleteHouseholdInput('')
                setDeleteHouseholdModalOpen(true)
              }}
              isLast
            />
          )}
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Modals
  // ---------------------------------------------------------------------------

  function renderSignOutModal() {
    return (
      <BaseModal
        isOpen={signOutModalOpen}
        onClose={() => setSignOutModalOpen(false)}
        title={t('settings:signOut.label')}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSignOutModalOpen(false)}
              className="flex-1 rounded-md border border-(--color-muted)/30 py-2.5 text-sm font-semibold text-(--color-muted)"
            >
              {t('common:cancel')}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex-1 rounded-md bg-(--color-primary) py-2.5 text-sm font-semibold text-white"
            >
              {t('settings:signOut.label')}
            </button>
          </>
        }
      >
        <p className="text-sm text-[#1a1a1a]">{t('settings:signOut.label')}?</p>
      </BaseModal>
    )
  }

  function renderTransferOwnerModal() {
    return (
      <BaseModal
        isOpen={transferOwnerModalOpen}
        onClose={() => setTransferOwnerModalOpen(false)}
        title={t('settings:deleteAccount.title')}
        footer={
          <>
            <button
              type="button"
              onClick={() => setTransferOwnerModalOpen(false)}
              className="flex-1 rounded-md border border-(--color-muted)/30 py-2.5 text-sm font-semibold text-(--color-muted)"
            >
              {t('common:cancel')}
            </button>
            <button
              type="button"
              onClick={handleTransferAndDelete}
              disabled={!selectedNewOwner || isDeleting}
              className="flex-1 rounded-md bg-(--color-error) py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isDeleting
                ? t('settings:deleteAccount.deletingAccount')
                : t('common:confirm')}
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-[#1a1a1a]">
          {t('settings:deleteAccount.ownerWithMembersPrompt')}
        </p>
        <label className="block">
          <span className="text-xs font-medium text-(--color-muted)">
            {t('settings:deleteAccount.selectNewOwner')}
          </span>
          <select
            value={selectedNewOwner}
            onChange={(e) => setSelectedNewOwner(e.target.value)}
            className="mt-1 w-full rounded-md border border-(--color-muted)/30 bg-(--color-surface) px-3 py-2.5 text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-(--color-primary)"
          >
            <option value="">—</option>
            {otherMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
          </select>
        </label>
        {mutationError && (
          <p className="mt-2 text-xs text-(--color-error)">{mutationError}</p>
        )}
      </BaseModal>
    )
  }

  function renderDeleteAccountModal() {
    const isSoloOwner = isOwner && members.length <= 1
    const warningText = isSoloOwner
      ? t('settings:deleteAccount.soloOwnerWarning')
      : t('settings:deleteAccount.memberWarning')
    const confirmWord = t('settings:deleteAccount.confirmWord')
    const canSubmit = deleteAccountInput === confirmWord && !isDeleting

    return (
      <BaseModal
        isOpen={deleteAccountModalOpen}
        onClose={() => setDeleteAccountModalOpen(false)}
        title={t('settings:deleteAccount.title')}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteAccountModalOpen(false)}
              className="flex-1 rounded-md border border-(--color-muted)/30 py-2.5 text-sm font-semibold text-(--color-muted)"
            >
              {t('common:cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteAccount}
              disabled={!canSubmit}
              className="flex-1 rounded-md bg-(--color-error) py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isDeleting
                ? t('settings:deleteAccount.deletingAccount')
                : t('common:delete')}
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-[#1a1a1a]">{warningText}</p>
        <label className="block">
          <span className="text-xs font-medium text-(--color-muted)">
            {t('settings:deleteAccount.confirmTypePlaceholder')}
          </span>
          <input
            type="text"
            value={deleteAccountInput}
            onChange={(e) => setDeleteAccountInput(e.target.value)}
            placeholder={confirmWord}
            autoComplete="off"
            className="mt-1 w-full rounded-md border border-(--color-muted)/30 bg-(--color-surface) px-3 py-2.5 text-sm font-mono tracking-wider text-[#1a1a1a] placeholder:text-(--color-muted)/50 focus:outline-none focus:ring-2 focus:ring-(--color-error)"
          />
        </label>
        {mutationError && (
          <p className="mt-2 text-xs text-(--color-error)">{mutationError}</p>
        )}
      </BaseModal>
    )
  }

  function renderDeleteHouseholdModal() {
    const confirmWord = t('settings:deleteHousehold.confirmWord')
    const canSubmit = deleteHouseholdInput === confirmWord && !isDeleting

    return (
      <BaseModal
        isOpen={deleteHouseholdModalOpen}
        onClose={() => setDeleteHouseholdModalOpen(false)}
        title={t('settings:deleteHousehold.title')}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteHouseholdModalOpen(false)}
              className="flex-1 rounded-md border border-(--color-muted)/30 py-2.5 text-sm font-semibold text-(--color-muted)"
            >
              {t('common:cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteHousehold}
              disabled={!canSubmit}
              className="flex-1 rounded-md bg-(--color-error) py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isDeleting
                ? t('settings:deleteHousehold.deletingHousehold')
                : t('common:delete')}
            </button>
          </>
        }
      >
        <ul className="mb-3 space-y-1.5 text-sm text-[#1a1a1a]">
          <li>⚠️ {t('settings:deleteHousehold.warning1')}</li>
          <li>⚠️ {t('settings:deleteHousehold.warning2')}</li>
          <li>⚠️ {t('settings:deleteHousehold.warning3')}</li>
        </ul>
        <label className="block">
          <span className="text-xs font-medium text-(--color-muted)">
            {t('settings:deleteHousehold.confirmTypePlaceholder')}
          </span>
          <input
            type="text"
            value={deleteHouseholdInput}
            onChange={(e) => setDeleteHouseholdInput(e.target.value)}
            placeholder={confirmWord}
            autoComplete="off"
            className="mt-1 w-full rounded-md border border-(--color-muted)/30 bg-(--color-surface) px-3 py-2.5 text-sm font-mono tracking-wider text-[#1a1a1a] placeholder:text-(--color-muted)/50 focus:outline-none focus:ring-2 focus:ring-(--color-error)"
          />
        </label>
        {mutationError && (
          <p className="mt-2 text-xs text-(--color-error)">{mutationError}</p>
        )}
      </BaseModal>
    )
  }

  // ---------------------------------------------------------------------------
  // Page render
  // ---------------------------------------------------------------------------

  return (
    <main
      className="min-h-screen bg-(--color-background) pb-20"
      data-testid="settings-page"
    >
      {/* Header */}
      <header className="flex items-center gap-2.5 bg-(--color-primary) px-4 py-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label={t('common:back')}
          className="p-1 text-white/85 text-xl"
        >
          ←
        </button>
        <h1 className="flex-1 text-xl font-bold text-white">
          {t('settings:title')}
        </h1>
      </header>

      {/* Content */}
      {renderUserCard()}
      {renderAppearanceSection()}
      {renderIntegrationsSection()}
      {renderHouseholdSection()}
      {renderAccountSection()}
      {renderDangerZone()}

      {/* Modals */}
      {renderSignOutModal()}
      {renderTransferOwnerModal()}
      {renderDeleteAccountModal()}
      {renderDeleteHouseholdModal()}
    </main>
  )
}

// ---------------------------------------------------------------------------
// Sub-components (file-local)
// ---------------------------------------------------------------------------

interface SettingsRowProps {
  icon: string
  iconBg: string
  label: string
  sublabel?: string | undefined
  action?: React.ReactNode | undefined
  // Accepts both sync and async handlers; return value is ignored
  onClick?: (() => void) | (() => Promise<void>) | undefined
  isLast?: boolean | undefined
  isLoading?: boolean | undefined
}

function SettingsRow({
  icon,
  iconBg,
  label,
  sublabel,
  action,
  onClick,
  isLast,
  isLoading,
}: SettingsRowProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={[
        'flex items-center gap-3.5 px-4 py-3.5',
        !isLast && 'border-b border-(--color-muted)/12',
        onClick ? 'cursor-pointer active:bg-(--color-muted)/5' : '',
        isLoading ? 'opacity-60' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={`size-[34px] rounded-lg flex items-center justify-center text-lg ${iconBg} shrink-0`}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-[#1a1a1a]">{label}</p>
        {sublabel && (
          <p className="text-xs text-(--color-muted) mt-0.5">{sublabel}</p>
        )}
      </div>
      {action}
    </div>
  )
}

interface DangerRowProps {
  icon: string
  label: string
  sublabel?: string | undefined
  onClick: () => void
  isLast?: boolean | undefined
}

function DangerRow({ icon, label, sublabel, onClick, isLast }: DangerRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={[
        'flex items-center gap-3.5 px-4 py-3.5 cursor-pointer active:bg-red-100',
        !isLast && 'border-b border-red-200/60',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="text-xl shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-(--color-error)">{label}</p>
        {sublabel && (
          <p className="text-xs text-(--color-error)/70 mt-0.5">{sublabel}</p>
        )}
      </div>
      <ChevronIcon className="text-(--color-error)" />
    </div>
  )
}

interface ToggleProps {
  on: boolean
  onChange: () => void
  'data-testid'?: string | undefined
  'aria-label'?: string | undefined
}

function Toggle({ on, onChange, 'data-testid': testId, 'aria-label': ariaLabel }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      data-testid={testId}
      onClick={onChange}
      className={[
        'relative shrink-0 w-[46px] h-[26px] rounded-full transition-colors',
        on ? 'bg-(--color-primary)' : 'bg-(--color-muted)/35',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-[3px] size-5 rounded-full bg-white shadow-sm transition-[inset-inline-start]',
          on ? 'start-[23px]' : 'start-[3px]',
        ].join(' ')}
      />
    </button>
  )
}

interface MemberRowProps {
  member: HouseholdMember
  index: number
}

function MemberRow({ member, index }: MemberRowProps) {
  const { t } = useTranslation('settings')
  const isOwner = member.role === 'owner'
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 border-t border-(--color-muted)/12">
      <div
        className={`size-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0 ${avatarColorClass(index)}`}
        aria-hidden="true"
        style={
          typeof avatarColorClass(index) === 'string' &&
          !avatarColorClass(index).startsWith('bg-')
            ? { backgroundColor: avatarColorClass(index) }
            : undefined
        }
      >
        {getInitial(member.display_name)}
      </div>
      <p className="flex-1 text-sm font-medium text-[#1a1a1a]">{member.display_name}</p>
      <span
        className={[
          'rounded-sm px-1.5 py-0.5 text-[11px] font-semibold',
          isOwner
            ? 'bg-(--color-primary)/8 text-(--color-primary)'
            : 'bg-(--color-muted)/12 text-(--color-muted)',
        ].join(' ')}
      >
        {isOwner
          ? t('householdInfo.owner')
          : t('householdInfo.member')}
      </span>
    </div>
  )
}

function ChevronIcon({ className = 'text-(--color-muted)' }: { className?: string | undefined }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="white" strokeWidth="1.5" />
      <path
        d="M3 10H2.5C1.67 10 1 9.33 1 8.5V2.5C1 1.67 1.67 1 2.5 1H8.5C9.33 1 10 1.67 10 2.5V3"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 3.5V6L7.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
