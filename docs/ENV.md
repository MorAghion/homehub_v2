# HomeHub — Environment Variables Reference

**Status:** Living document | **Last updated:** 2026-03-26
**Source of truth for:** all environment variables required across frontend, backend (Edge Functions), and CI

> **Security rule:** Never commit actual values to git. Never put secret variables (service role key, Google client secret, VAPID private key) in any file that ships to the browser or is stored in a public location.

---

## Table of Contents

1. [Supabase](#1-supabase)
2. [Google OAuth / Gmail API](#2-google-oauth--gmail-api)
3. [Web Push / VAPID (Phase 1.3)](#3-web-push--vapid-phase-13)
4. [Vercel](#4-vercel)
5. [GitHub Actions (CI)](#5-github-actions-ci)
6. [Local Development Setup (.env.local)](#6-local-development-setup-envlocal)
7. [Variable Matrix by Environment](#7-variable-matrix-by-environment)

---

## 1. Supabase

Supabase provides authentication, PostgreSQL database, storage, Edge Functions, and Realtime. All variables are obtained from the **Supabase Dashboard → Project Settings → API**.

| Variable | Service | Used For | How to Obtain | Required | Environment |
|----------|---------|----------|---------------|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase | The project's REST + Auth + Realtime base URL. Passed to the Supabase JS client on initialisation (`createClient(url, anonKey)`). | Dashboard → Project Settings → API → **Project URL** | Required | Frontend, CI |
| `VITE_SUPABASE_ANON_KEY` | Supabase | The public anon key for the Supabase JS client. Safe to expose in the browser because all data access is controlled by Row Level Security (RLS) policies. | Dashboard → Project Settings → API → **Project API keys → anon / public** | Required | Frontend, CI |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Elevated key used by Edge Functions to bypass RLS when performing server-side operations (e.g., writing OAuth tokens on behalf of a user, running scheduled bill scans). **Never expose to the browser.** | Dashboard → Project Settings → API → **Project API keys → service_role / secret** | Required | Backend (Edge Functions) |
| `SUPABASE_JWT_SECRET` | Supabase | Used by Edge Functions to verify that incoming JWTs were signed by this Supabase project, ensuring requests are authentic. | Dashboard → Project Settings → API → **JWT Settings → JWT Secret** | Required | Backend (Edge Functions) |

---

## 2. Google OAuth / Gmail API

A single Google Cloud OAuth 2.0 application covers both **Sign in with Google** (used in the browser popup flow) and **Gmail API access** (used by Edge Functions for bill scanning). All variables are obtained from the **Google Cloud Console → APIs & Services → Credentials**.

| Variable | Service | Used For | How to Obtain | Required | Environment |
|----------|---------|----------|---------------|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth | The OAuth client ID used by the React frontend to initiate the Google sign-in popup flow (`supabase.auth.signInWithOAuth`). This is the same client ID as `GOOGLE_CLIENT_ID` — it is set separately as a `VITE_` var so Vite bundles it into the browser build. | Cloud Console → OAuth 2.0 Client IDs → **Client ID** | Required | Frontend, CI |
| `GOOGLE_CLIENT_ID` | Google OAuth / Gmail API | The OAuth client ID used by Edge Functions (`gmail-auth`, `gmail-fetch`) to identify the application when exchanging authorization codes and refreshing tokens with Google. Same value as `VITE_GOOGLE_CLIENT_ID`. | Cloud Console → OAuth 2.0 Client IDs → **Client ID** | Required | Backend (Edge Functions) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth / Gmail API | The OAuth client secret used by Edge Functions to complete the authorization code exchange (`gmail-auth`) and to refresh access tokens (`gmail-fetch`). **Never expose to the browser.** | Cloud Console → OAuth 2.0 Client IDs → **Client secret** | Required | Backend (Edge Functions) |

**OAuth app configuration notes:**
- Authorized JavaScript origins must include the app's production URL (`https://our-homehub.vercel.app`) and `http://localhost:5173` for local development.
- Authorized redirect URIs must include the Supabase Auth callback URL (found in Dashboard → Authentication → URL Configuration) and the local equivalent.
- Required OAuth scopes: `openid`, `email`, `profile` (for sign-in); `https://www.googleapis.com/auth/gmail.readonly` (for bill scanning).
- Google Calendar (`calendar.readonly`) is scoped for Phase 1.2 and uses the same OAuth app — add the scope when implementing that phase.

---

## 3. Web Push / VAPID (Phase 1.3)

Required only for the `push-dispatcher` Edge Function. Not needed until Phase 1.3 (push notifications). Generate a VAPID key pair using the `web-push` CLI or any VAPID key generator.

| Variable | Service | Used For | How to Obtain | Required | Environment |
|----------|---------|----------|---------------|----------|-------------|
| `VITE_VAPID_PUBLIC_KEY` | Web Push | The VAPID public key embedded in the service worker and used by the browser when subscribing to push notifications (`pushManager.subscribe({ applicationServerKey })`). Safe to expose publicly. | Generate a VAPID key pair with `npx web-push generate-vapid-keys` → **Public Key** | Optional (Phase 1.3) | Frontend, CI |
| `VAPID_PRIVATE_KEY` | Web Push | The VAPID private key used by the `push-dispatcher` Edge Function to sign push notification requests sent to browser push services. **Never expose to the browser.** | `npx web-push generate-vapid-keys` → **Private Key** | Optional (Phase 1.3) | Backend (Edge Functions) |
| `VAPID_SUBJECT` | Web Push | A `mailto:` URI or HTTPS URL identifying the push sender. Required by the VAPID protocol. Used by the `push-dispatcher` Edge Function when constructing the Authorization header. | Set to `mailto:admin@your-domain.com` or the app's production URL | Optional (Phase 1.3) | Backend (Edge Functions) |

---

## 4. Vercel

Vercel is the hosting and deployment platform. The Vercel GitHub App handles preview and production deployments automatically — no Vercel secrets need to be manually added to GitHub Actions when using the native integration.

Configuration is managed in the **Vercel Dashboard → Project → Settings → Environment Variables**. Add all `VITE_` frontend variables there so they are available during Vercel's build step.

| Variable | Where set | Notes |
|----------|-----------|-------|
| `VITE_SUPABASE_URL` | Vercel Dashboard | Required for the Vite build that Vercel runs |
| `VITE_SUPABASE_ANON_KEY` | Vercel Dashboard | Required for the Vite build |
| `VITE_GOOGLE_CLIENT_ID` | Vercel Dashboard | Required for the Vite build |
| `VITE_VAPID_PUBLIC_KEY` | Vercel Dashboard | Required for the Vite build (Phase 1.3 onwards) |

Vercel environment variables can be scoped to **Production**, **Preview**, and **Development** environments within the dashboard.

---

## 5. GitHub Actions (CI)

The CI pipeline (`.github/workflows/`) runs lint → typecheck → Vitest unit/component tests → Vite build on every PR. The `VITE_` variables must be available at build time so TypeScript compilation and the Vite build step succeed.

Add these as **Repository Secrets** in **GitHub → Repository → Settings → Secrets and variables → Actions**:

| Secret Name | Used For | How to Obtain |
|-------------|----------|---------------|
| `VITE_SUPABASE_URL` | Vite build and TypeScript checks that import the Supabase client | Supabase Dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Vite build and any CI test that initialises the Supabase client | Supabase Dashboard → Project Settings → API → anon key |
| `VITE_GOOGLE_CLIENT_ID` | Vite build (frontend references this constant) | Google Cloud Console → OAuth 2.0 Client IDs → Client ID |
| `VITE_VAPID_PUBLIC_KEY` | Vite build once Phase 1.3 ships | VAPID key generation (see §3) |

**What CI does NOT need:** `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, `SUPABASE_JWT_SECRET`, `VAPID_PRIVATE_KEY`. These are Edge Function secrets; CI only runs lint, typecheck, unit tests, and a Vite build — none of which invoke Edge Functions.

---

## 6. Local Development Setup (.env.local)

Vite reads `.env.local` automatically and it is already listed in `.gitignore`. Never commit this file.

Create `.env.local` in the project root:

```
# ─── Supabase ───────────────────────────────────────────────────────────────
# Obtain from: Supabase Dashboard → Project Settings → API
VITE_SUPABASE_URL=                     # Project URL (e.g. https://xxxx.supabase.co)
VITE_SUPABASE_ANON_KEY=                # anon / public key

# ─── Google OAuth ────────────────────────────────────────────────────────────
# Obtain from: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs
VITE_GOOGLE_CLIENT_ID=                 # Client ID (same value used in GOOGLE_CLIENT_ID for Edge Functions)

# ─── Web Push / VAPID (Phase 1.3 only) ───────────────────────────────────────
# Generate with: npx web-push generate-vapid-keys
# VITE_VAPID_PUBLIC_KEY=
```

**Edge Function secrets for local development** (used when running `supabase functions serve`):

Create `supabase/.env.local` (this file is gitignored by the Supabase CLI):

```
# Obtain from Supabase Dashboard → Project Settings → API
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

# Obtain from Google Cloud Console → Credentials → OAuth 2.0 Client IDs
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Phase 1.3 only — generate with: npx web-push generate-vapid-keys
# VAPID_PRIVATE_KEY=
# VAPID_SUBJECT=mailto:your@email.com
```

Pass this file when serving Edge Functions locally:
```bash
supabase functions serve --env-file supabase/.env.local
```

---

## 7. Variable Matrix by Environment

| Variable | Frontend (browser) | Edge Functions (server) | GitHub Actions (CI) | Vercel (build) |
|----------|--------------------|------------------------|---------------------|----------------|
| `VITE_SUPABASE_URL` | ✓ | — | ✓ | ✓ |
| `VITE_SUPABASE_ANON_KEY` | ✓ | — | ✓ | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | — | ✓ | — | — |
| `SUPABASE_JWT_SECRET` | — | ✓ | — | — |
| `VITE_GOOGLE_CLIENT_ID` | ✓ | — | ✓ | ✓ |
| `GOOGLE_CLIENT_ID` | — | ✓ | — | — |
| `GOOGLE_CLIENT_SECRET` | — | ✓ | — | — |
| `VITE_VAPID_PUBLIC_KEY` | ✓ (Phase 1.3) | — | ✓ (Phase 1.3) | ✓ (Phase 1.3) |
| `VAPID_PRIVATE_KEY` | — | ✓ (Phase 1.3) | — | — |
| `VAPID_SUBJECT` | — | ✓ (Phase 1.3) | — | — |

**Legend:** ✓ = required in this environment | — = not used here | (Phase 1.3) = not needed until that phase ships
