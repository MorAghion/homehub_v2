/**
 * bill-scanner — Supabase Edge Function
 *
 * Fetches a Gmail message by ID using the user's stored OAuth token,
 * returns the raw email content for bill extraction.
 *
 * POST body: { messageId: string, userId: string }
 * Returns:   { messageId, subject, from, date, body }
 *
 * Required env vars (injected by Supabase):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messageId, userId } = await req.json() as { messageId: string; userId: string }

    if (!messageId || !userId) {
      return new Response(JSON.stringify({ error: 'messageId and userId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch the stored OAuth token for this user
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('user_gmail_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .single()

    if (tokenErr || !tokenRow) {
      return new Response(JSON.stringify({ error: 'Gmail not connected for this user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Refresh token if expired
    let accessToken = tokenRow.access_token
    const expiresAt = new Date(tokenRow.expires_at).getTime()
    if (Date.now() > expiresAt - 60_000) {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GMAIL_CLIENT_ID')!,
          client_secret: Deno.env.get('GMAIL_CLIENT_SECRET')!,
          refresh_token: tokenRow.refresh_token,
          grant_type: 'refresh_token',
        }),
      })
      const refreshData = await refreshRes.json() as { access_token?: string; expires_in?: number }
      if (!refreshData.access_token) {
        return new Response(JSON.stringify({ error: 'Failed to refresh Gmail token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      accessToken = refreshData.access_token
      const newExpiry = new Date(Date.now() + (refreshData.expires_in ?? 3600) * 1000).toISOString()
      await supabase
        .from('user_gmail_tokens')
        .update({ access_token: accessToken, expires_at: newExpiry })
        .eq('user_id', userId)
    }

    // Fetch the Gmail message
    const gmailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!gmailRes.ok) {
      return new Response(JSON.stringify({ error: `Gmail API error: ${gmailRes.status}` }), {
        status: gmailRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const gmailMsg = await gmailRes.json() as {
      payload: {
        headers: { name: string; value: string }[]
        body?: { data?: string }
        parts?: { mimeType: string; body?: { data?: string } }[]
      }
    }

    const headers = gmailMsg.payload.headers
    const subject = headers.find((h) => h.name.toLowerCase() === 'subject')?.value ?? ''
    const from = headers.find((h) => h.name.toLowerCase() === 'from')?.value ?? ''
    const date = headers.find((h) => h.name.toLowerCase() === 'date')?.value ?? ''

    // Extract body — prefer text/plain, fall back to text/html
    let body = ''
    const extractText = (data: string) =>
      new TextDecoder().decode(
        Uint8Array.from(atob(data.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
      )

    if (gmailMsg.payload.body?.data) {
      body = extractText(gmailMsg.payload.body.data)
    } else if (gmailMsg.payload.parts) {
      const textPart = gmailMsg.payload.parts.find((p) => p.mimeType === 'text/plain')
      const htmlPart = gmailMsg.payload.parts.find((p) => p.mimeType === 'text/html')
      const part = textPart ?? htmlPart
      if (part?.body?.data) body = extractText(part.body.data)
    }

    return new Response(
      JSON.stringify({ messageId, subject, from, date, body }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
