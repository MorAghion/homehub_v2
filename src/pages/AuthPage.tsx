/**
 * AuthPage — PRD §6
 *
 * Five modes, driven by ?mode= query param (or hash detection for reset):
 *   signin  — email + password, Google OAuth, links to signup/forgot
 *   signup  — display_name + email + password
 *   join    — invite code + display_name + email + password
 *   forgot  — email → sends Supabase reset link
 *   reset   — new password (shown when URL hash contains type=recovery)
 *
 * Google OAuth: popup window + localStorage polling (PRD §6.9)
 * Security: no tokens written to localStorage (SECURITY.md §1)
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useSession } from '../contexts/AuthContext'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuthMode = 'signin' | 'signup' | 'join' | 'forgot' | 'reset'
type TabMode = 'signin' | 'signup' | 'join'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseMode(raw: string | null, hash: string): AuthMode {
  if (hash.includes('type=recovery')) return 'reset'
  if (raw === 'signup' || raw === 'join' || raw === 'forgot' || raw === 'reset') return raw
  return 'signin'
}

function classNames(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}

// ---------------------------------------------------------------------------
// Sub-form: Sign In
// ---------------------------------------------------------------------------

function SignInForm() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function cleanup() {
    if (pollRef.current) clearInterval(pollRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  useEffect(() => () => cleanup(), [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      if (authErr) {
        if (authErr.message.toLowerCase().includes('email not confirmed')) {
          setError(t('errors.emailNotConfirmed'))
        } else {
          setError(t('errors.invalidCredentials'))
        }
        return
      }
      navigate('/', { replace: true })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogle() {
    setError('')
    const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        skipBrowserRedirect: true,
      },
    })
    if (oauthErr || !data.url) {
      setError(t('errors.generic'))
      return
    }
    const popup = window.open(data.url, '_blank', 'width=500,height=600,noopener,noreferrer')
    if (!popup) {
      setError(t('errors.googlePopupBlocked'))
      return
    }

    cleanup()
    pollRef.current = setInterval(() => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          cleanup()
          popup.close()
          navigate('/', { replace: true })
        }
      })
    }, 500)

    timeoutRef.current = setTimeout(() => {
      cleanup()
      popup.close()
      setError(t('errors.googleTimeout'))
    }, 5 * 60 * 1000)
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="signin-email" className="text-sm font-medium text-[#1a1a1a]">
          {t('signIn.emailLabel')}
        </label>
        <input
          id="signin-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('signIn.emailPlaceholder')}
          required
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label htmlFor="signin-password" className="text-sm font-medium text-[#1a1a1a]">
            {t('signIn.passwordLabel')}
          </label>
          <button
            type="button"
            onClick={() => setSearchParams({ mode: 'forgot' })}
            className="text-xs text-[--color-primary] hover:underline"
          >
            {t('signIn.forgotPassword')}
          </button>
        </div>
        <input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('signIn.passwordPlaceholder')}
          required
          className={inputClass}
        />
      </div>

      {error && <p role="alert" className={errorClass}>{error}</p>}

      <button type="submit" disabled={submitting} className={primaryButtonClass}>
        {submitting ? t('signIn.submitting') : t('signIn.submit')}
      </button>

      <div className="relative flex items-center gap-2 py-1">
        <div className="flex-1 h-px bg-[--color-muted]/20" />
        <span className="text-xs text-[--color-muted]">or</span>
        <div className="flex-1 h-px bg-[--color-muted]/20" />
      </div>

      <button
        type="button"
        onClick={() => void handleGoogle()}
        className={googleButtonClass}
      >
        <GoogleIcon />
        {t('signIn.googleButton')}
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Sub-form: Sign Up
// ---------------------------------------------------------------------------

function SignUpForm() {
  const { t } = useTranslation('auth')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function cleanup() {
    if (pollRef.current) clearInterval(pollRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  useEffect(() => () => cleanup(), [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError(t('errors.weakPassword'))
      return
    }
    setSubmitting(true)
    try {
      const { error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      })
      if (authErr) {
        setError(t('errors.generic'))
        return
      }
      setSuccess(true)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogle() {
    setError('')
    const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        skipBrowserRedirect: true,
      },
    })
    if (oauthErr || !data.url) {
      setError(t('errors.generic'))
      return
    }
    const popup = window.open(data.url, '_blank', 'width=500,height=600,noopener,noreferrer')
    if (!popup) {
      setError(t('errors.googlePopupBlocked'))
      return
    }
    cleanup()
    pollRef.current = setInterval(() => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          cleanup()
          popup.close()
          navigate('/', { replace: true })
        }
      })
    }, 500)
    timeoutRef.current = setTimeout(() => {
      cleanup()
      popup.close()
      setError(t('errors.googleTimeout'))
    }, 5 * 60 * 1000)
  }

  if (success) {
    return (
      <div className="py-4 text-center text-sm text-[--color-muted]">
        {t('signUp.checkEmail')}
      </div>
    )
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="signup-name" className="text-sm font-medium text-[#1a1a1a]">
          {t('signUp.displayNameLabel')}
        </label>
        <input
          id="signup-name"
          type="text"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t('signUp.displayNamePlaceholder')}
          required
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="signup-email" className="text-sm font-medium text-[#1a1a1a]">
          {t('signUp.emailLabel')}
        </label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('signUp.emailPlaceholder')}
          required
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="signup-password" className="text-sm font-medium text-[#1a1a1a]">
          {t('signUp.passwordLabel')}
        </label>
        <input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('signUp.passwordPlaceholder')}
          required
          className={inputClass}
        />
      </div>

      {error && <p role="alert" className={errorClass}>{error}</p>}

      <button type="submit" disabled={submitting} className={primaryButtonClass}>
        {submitting ? t('signUp.submitting') : t('signUp.submit')}
      </button>

      <div className="relative flex items-center gap-2 py-1">
        <div className="flex-1 h-px bg-[--color-muted]/20" />
        <span className="text-xs text-[--color-muted]">or</span>
        <div className="flex-1 h-px bg-[--color-muted]/20" />
      </div>

      <button
        type="button"
        onClick={() => void handleGoogle()}
        className={googleButtonClass}
      >
        <GoogleIcon />
        {t('signUp.googleButton')}
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Sub-form: Join
// ---------------------------------------------------------------------------

function JoinForm() {
  const { t } = useTranslation('auth')
  const [inviteCode, setInviteCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const code = inviteCode.trim().toUpperCase()
    if (!/^[A-Z0-9]{8}$/.test(code)) {
      setError(t('errors.invalidInviteCode'))
      return
    }
    if (password.length < 6) {
      setError(t('errors.weakPassword'))
      return
    }

    setSubmitting(true)
    try {
      // Store invite code before registration so it survives email confirmation
      localStorage.setItem('homehub-pending-invite', code)

      const { error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      })
      if (authErr) {
        localStorage.removeItem('homehub-pending-invite')
        setError(t('errors.generic'))
        return
      }
      setSuccess(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="py-4 text-center text-sm text-[--color-muted]">
        {t('join.checkEmail')}
      </div>
    )
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="join-code" className="text-sm font-medium text-[#1a1a1a]">
          {t('join.inviteCodeLabel')}
        </label>
        <input
          id="join-code"
          type="text"
          autoComplete="off"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          placeholder={t('join.inviteCodePlaceholder')}
          maxLength={8}
          required
          className={classNames(inputClass, 'tracking-widest font-mono')}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="join-name" className="text-sm font-medium text-[#1a1a1a]">
          {t('join.displayNameLabel')}
        </label>
        <input
          id="join-name"
          type="text"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t('join.displayNamePlaceholder')}
          required
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="join-email" className="text-sm font-medium text-[#1a1a1a]">
          {t('join.emailLabel')}
        </label>
        <input
          id="join-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('join.emailPlaceholder')}
          required
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="join-password" className="text-sm font-medium text-[#1a1a1a]">
          {t('join.passwordLabel')}
        </label>
        <input
          id="join-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('join.passwordPlaceholder')}
          required
          className={inputClass}
        />
      </div>

      {error && <p role="alert" className={errorClass}>{error}</p>}

      <button type="submit" disabled={submitting} className={primaryButtonClass}>
        {submitting ? t('join.submitting') : t('join.submit')}
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Sub-form: Forgot Password
// ---------------------------------------------------------------------------

function ForgotForm({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { error: authErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (authErr) {
        setError(t('errors.generic'))
        return
      }
      setSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[--color-muted]">{t('forgot.description')}</p>

      {sent ? (
        <p className="text-sm text-[--color-success] font-medium">{t('forgot.sent')}</p>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="forgot-email" className="text-sm font-medium text-[#1a1a1a]">
              {t('forgot.emailLabel')}
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('forgot.emailPlaceholder')}
              required
              className={inputClass}
            />
          </div>

          {error && <p role="alert" className={errorClass}>{error}</p>}

          <button type="submit" disabled={submitting} className={primaryButtonClass}>
            {submitting ? t('forgot.submitting') : t('forgot.submit')}
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={onBack}
        className="text-sm text-[--color-primary] hover:underline self-center"
      >
        {t('forgot.backToSignIn')}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-form: Reset Password
// ---------------------------------------------------------------------------

function ResetForm({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError(t('errors.weakPassword'))
      return
    }
    setSubmitting(true)
    try {
      const { error: authErr } = await supabase.auth.updateUser({ password })
      if (authErr) {
        setError(t('errors.generic'))
        return
      }
      setSuccess(true)
      setTimeout(() => navigate('/auth?mode=signin', { replace: true }), 2000)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {success ? (
        <p className="text-sm text-[--color-success] font-medium">{t('reset.success')}</p>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="reset-password" className="text-sm font-medium text-[#1a1a1a]">
              {t('reset.passwordLabel')}
            </label>
            <input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('reset.passwordPlaceholder')}
              required
              className={inputClass}
            />
          </div>

          {error && <p role="alert" className={errorClass}>{error}</p>}

          <button type="submit" disabled={submitting} className={primaryButtonClass}>
            {submitting ? t('reset.submitting') : t('reset.submit')}
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={onBack}
        className="text-sm text-[--color-primary] hover:underline self-center"
      >
        {t('reset.backToSignIn')}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create Household Modal
// Shown when user is signed in but has no household_id.
// ---------------------------------------------------------------------------

function CreateHouseholdModal({ onCreated }: { onCreated: () => void }) {
  const { t } = useTranslation('auth')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: household, error: insertErr } = await supabase
        .from('households')
        .insert({ name: name.trim() })
        .select('id')
        .single()

      if (insertErr || !household) {
        setError(t('errors.generic'))
        return
      }

      const { error: profileErr } = await supabase
        .from('user_profiles')
        .update({ household_id: household.id, role: 'owner' })
        .eq('id', user.id)

      if (profileErr) {
        setError(t('errors.generic'))
        return
      }

      onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-md rounded-t-xl sm:rounded-xl bg-[--color-surface] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[#1a1a1a] mb-1">
          {t('createHousehold.title')}
        </h2>
        <p className="text-sm text-[--color-muted] mb-4">
          {t('createHousehold.description')}
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="household-name" className="text-sm font-medium text-[#1a1a1a]">
              {t('createHousehold.nameLabel')}
            </label>
            <input
              id="household-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('createHousehold.namePlaceholder')}
              required
              className={inputClass}
              autoFocus
            />
          </div>

          {error && <p role="alert" className={errorClass}>{error}</p>}

          <button type="submit" disabled={submitting || !name.trim()} className={primaryButtonClass}>
            {submitting ? t('createHousehold.submitting') : t('createHousehold.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared CSS class constants
// ---------------------------------------------------------------------------

const inputClass = [
  'w-full rounded-md border border-[--color-muted]/30',
  'bg-[--color-surface] px-3 py-2.5',
  'text-base text-[#1a1a1a] placeholder:text-[--color-muted]',
  'focus:outline-none focus:ring-2 focus:ring-[--color-primary]/40 focus:border-[--color-primary]',
  'transition-colors',
].join(' ')

const primaryButtonClass = [
  'w-full rounded-md bg-[--color-primary] px-4 py-2.5',
  'text-base font-semibold text-white',
  'hover:opacity-90 active:opacity-80 transition-opacity',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ')

const googleButtonClass = [
  'w-full rounded-md border border-[--color-muted]/30',
  'bg-[--color-surface] px-4 py-2.5',
  'flex items-center justify-center gap-2',
  'text-base font-semibold text-[#1a1a1a]',
  'hover:bg-[--color-background] active:bg-[--color-background]/80 transition-colors',
].join(' ')

const errorClass = 'text-sm text-[--color-error] font-medium'

// ---------------------------------------------------------------------------
// Google icon SVG
// ---------------------------------------------------------------------------

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// AuthPage
// ---------------------------------------------------------------------------

export default function AuthPage() {
  const { t } = useTranslation('auth')
  const [searchParams, setSearchParams] = useSearchParams()
  const { session, needsHousehold, refreshProfile } = useSession()
  const navigate = useNavigate()

  const mode = parseMode(searchParams.get('mode'), window.location.hash)
  const activeTab: TabMode = mode === 'signin' || mode === 'forgot' ? 'signin'
    : mode === 'signup' ? 'signup'
    : 'join'

  // Redirect authenticated users (with household) to home
  useEffect(() => {
    if (session && !needsHousehold) {
      navigate('/', { replace: true })
    }
  }, [session, needsHousehold, navigate])

  function setTab(tab: TabMode) {
    setSearchParams({ mode: tab })
  }

  const tabModes: { key: TabMode; label: string }[] = [
    { key: 'signin', label: t('tabs.signIn') },
    { key: 'signup', label: t('tabs.signUp') },
    { key: 'join', label: t('tabs.join') },
  ]

  const isForgotOrReset = mode === 'forgot' || mode === 'reset'

  const title =
    mode === 'forgot' ? t('forgot.title')
    : mode === 'reset' ? t('reset.title')
    : mode === 'signup' ? t('signUp.title')
    : mode === 'join' ? t('join.title')
    : t('signIn.title')

  return (
    <main className="min-h-screen bg-[--color-background] flex flex-col items-center justify-center px-4 py-12">
      {/* Create Household modal — shown when signed in but household_id is null */}
      {needsHousehold && (
        <CreateHouseholdModal onCreated={() => void refreshProfile()} />
      )}

      <div className="w-full max-w-sm">
        {/* App logo / wordmark */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[--color-primary]">HomeHub</h1>
        </div>

        {/* Card */}
        <div className="bg-[--color-surface] rounded-xl shadow-md p-6">
          {/* Mode title (shown for forgot/reset only — tabs cover the rest) */}
          {isForgotOrReset ? (
            <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">{title}</h2>
          ) : (
            /* Tabs */
            <div
              role="tablist"
              aria-label="Auth mode"
              className="flex gap-0 mb-6 border-b border-[--color-muted]/20"
            >
              {tabModes.map(({ key, label }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={activeTab === key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={classNames(
                    'flex-1 pb-2.5 text-sm font-semibold transition-colors border-b-2',
                    activeTab === key
                      ? 'text-[--color-primary] border-[--color-primary]'
                      : 'text-[--color-muted] border-transparent hover:text-[#1a1a1a]',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Forms */}
          {mode === 'forgot' && (
            <ForgotForm onBack={() => setSearchParams({ mode: 'signin' })} />
          )}
          {mode === 'reset' && (
            <ResetForm onBack={() => setSearchParams({ mode: 'signin' })} />
          )}
          {mode === 'signin' && <SignInForm />}
          {mode === 'signup' && <SignUpForm />}
          {mode === 'join' && <JoinForm />}
        </div>
      </div>
    </main>
  )
}
