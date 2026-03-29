/**
 * gmail-disconnect — Supabase Edge Function
 *
 * Revokes Google OAuth tokens and removes them from the database.
 * Called by the Settings page when the user clicks "Disconnect Gmail".
 *
 * Method: POST (no body required)
 * Returns: { success: true }
 *
 * Required env vars (injected automatically by Supabase):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const userId = await getUserIdFromRequest(req)
  if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Fetch current tokens so we can revoke them with Google
  const { data: tokenRow } = await supabase
    .from('oauth_tokens')
    .select('access_token, refresh_token')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .maybeSingle()

  if (tokenRow) {
    // Prefer revoking the refresh_token — it invalidates all associated access tokens.
    // Fall back to access_token if no refresh_token is stored.
    const tokenToRevoke = tokenRow.refresh_token ?? tokenRow.access_token
    if (tokenToRevoke) {
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenToRevoke)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      ).catch(err => {
        // Best-effort: proceed even if revocation fails (token may be expired)
        console.warn('Token revocation failed (proceeding):', err)
      })
    }
  }

  // Remove the row from the database regardless of revocation outcome
  const { error: deleteErr } = await supabase
    .from('oauth_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('provider', 'google')

  if (deleteErr) {
    console.error('Failed to delete oauth_tokens row:', deleteErr)
    return jsonResponse({ error: 'Failed to disconnect Gmail' }, 500)
  }

  return jsonResponse({ success: true })
})
