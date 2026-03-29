/**
 * gmail-auth — Supabase Edge Function
 *
 * Handles the Gmail OAuth flow for the Bills feature.
 *
 * Actions (dispatched by POST body):
 *   get_auth_url — returns the Google consent-screen URL (client opens in popup)
 *
 * Actions (dispatched by GET query param):
 *   callback     — handles the OAuth redirect, stores tokens, redirects to app
 *
 * Required env vars:
 *   GMAIL_CLIENT_ID       — from Google Cloud Console
 *   GMAIL_CLIENT_SECRET   — from Google Cloud Console
 *   SUPABASE_URL          — injected automatically by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — injected automatically by Supabase
 *   SITE_URL              — app deployment URL (e.g. https://homehub.app)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GMAIL_CLIENT_ID = Deno.env.get('GMAIL_CLIENT_ID')!
const GMAIL_CLIENT_SECRET = Deno.env.get('GMAIL_CLIENT_SECRET')!
const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/gmail-auth?action=callback`
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
// 90-day retroactive scan window, as specified in the bead
const RETROACTIVE_SCAN_DAYS = 90

const CORS_HEADERS: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ---- Utilities --------------------------------------------------------------

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

function toB64Url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64Url(input: string): string {
  return atob(input.replace(/-/g, '+').replace(/_/g, '/'))
}

/**
 * Create a short-lived HS256 JWT to use as the OAuth `state` param.
 * Signed with the service-role key — never leaves the server except as an
 * opaque token in the redirect URL.
 */
async function createStateToken(userId: string): Promise<string> {
  const iat = Math.floor(Date.now() / 1000)
  const payload = { sub: userId, iat, exp: iat + 600 } // 10-min expiry
  const enc = new TextEncoder()
  const header = toB64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = toB64Url(JSON.stringify(payload))
  const unsigned = `${header}.${body}`

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(SUPABASE_SERVICE_ROLE_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(unsigned))
  const sigB64 = toB64Url(String.fromCharCode(...new Uint8Array(sig)))
  return `${unsigned}.${sigB64}`
}

/**
 * Verify a state token and return the embedded user_id, or null on failure.
 */
async function verifyStateToken(token: string): Promise<string | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const enc = new TextEncoder()
  const unsigned = `${parts[0]}.${parts[1]}`

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(SUPABASE_SERVICE_ROLE_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  let sigBytes: Uint8Array
  try {
    sigBytes = Uint8Array.from(fromB64Url(parts[2]), c => c.charCodeAt(0))
  } catch {
    return null
  }

  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(unsigned))
  if (!valid) return null

  try {
    const payload = JSON.parse(fromB64Url(parts[1])) as { sub: string; exp: number }
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload.sub
  } catch {
    return null
  }
}

/**
 * Extract the authenticated user ID from the Supabase Bearer token in the
 * Authorization header.
 */
async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const {
    data: { user },
    error,
  } = await client.auth.getUser(token)
  if (error || !user) return null
  return user.id
}

// ---- Action handlers --------------------------------------------------------

/**
 * POST { action: 'get_auth_url' }
 * Returns { auth_url } — the Google consent-screen URL.
 * The client opens it in a popup (per PRD §3.3).
 */
async function handleGetAuthUrl(req: Request): Promise<Response> {
  const userId = await getUserIdFromRequest(req)
  if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401)

  const state = await createStateToken(userId)

  const params = new URLSearchParams({
    client_id: GMAIL_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: GMAIL_SCOPE,
    access_type: 'offline', // request refresh_token
    prompt: 'consent', // force consent to always get refresh_token
    state,
  })

  return jsonResponse({ auth_url: `https://accounts.google.com/o/oauth2/auth?${params.toString()}` })
}

/**
 * GET ?action=callback&code=...&state=...
 * Called by Google after the user grants consent.
 * Exchanges the code for tokens, stores them, then redirects the popup to the
 * app's Settings page.
 */
async function handleCallback(url: URL): Promise<Response> {
  const appSettings = `${SITE_URL}/settings`

  const errorParam = url.searchParams.get('error')
  if (errorParam) {
    return Response.redirect(`${appSettings}?gmail=error&reason=${encodeURIComponent(errorParam)}`, 302)
  }

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state) {
    return Response.redirect(`${appSettings}?gmail=error&reason=missing_params`, 302)
  }

  const userId = await verifyStateToken(state)
  if (!userId) {
    return Response.redirect(`${appSettings}?gmail=error&reason=invalid_state`, 302)
  }

  // Exchange authorization code for access + refresh tokens
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    console.error('Token exchange failed:', await tokenRes.text())
    return Response.redirect(`${appSettings}?gmail=error&reason=token_exchange_failed`, 302)
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }

  // Fetch the Gmail account's email address so we can display it in Settings
  let providerEmail: string | null = null
  const userinfoRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (userinfoRes.ok) {
    const info = (await userinfoRes.json()) as { email?: string }
    providerEmail = info.email ?? null
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  // Retroactive scan window: 90 days back
  const lastScannedAt = new Date(Date.now() - RETROACTIVE_SCAN_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const upsertData: Record<string, unknown> = {
    user_id: userId,
    provider: 'google',
    access_token: tokens.access_token,
    expires_at: expiresAt,
    last_scanned_at: lastScannedAt,
    provider_email: providerEmail,
  }
  // Only overwrite refresh_token when Google returns one (it only does on first auth or re-consent)
  if (tokens.refresh_token) {
    upsertData.refresh_token = tokens.refresh_token
  }

  const { error: upsertErr } = await supabase
    .from('oauth_tokens')
    .upsert(upsertData, { onConflict: 'user_id,provider' })

  if (upsertErr) {
    console.error('Failed to upsert oauth_tokens:', upsertErr)
    return Response.redirect(`${appSettings}?gmail=error&reason=db_error`, 302)
  }

  return Response.redirect(`${appSettings}?gmail=connected`, 302)
}

// ---- Entry point ------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  const url = new URL(req.url)
  const queryAction = url.searchParams.get('action')

  // Google redirects here after OAuth consent (browser GET)
  if (req.method === 'GET' && queryAction === 'callback') {
    return handleCallback(url)
  }

  // Supabase client calls (POST with JSON body)
  if (req.method === 'POST') {
    let body: { action?: string } = {}
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    if (body.action === 'get_auth_url') {
      return handleGetAuthUrl(req)
    }
  }

  return jsonResponse({ error: 'Invalid request' }, 400)
})
