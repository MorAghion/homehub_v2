# HomeHub v2 — Planning Checklist

This file is the source of truth for all documents that must exist before coding begins.
The Mayor and Architect must verify every document is complete and approved before spawning coding polecats.

---

## Document Registry

| Document | Consists of | Details & Examples | Status | Responsible Agent |
|----------|-------------|-------------------|--------|-------------------|
| `PRD_v3.md` | Product requirements, system architecture, data models, feature specs, roadmap | Vision, glossary, tech stack, schema, all hub specs (Shopping, Tasks, Vouchers, Reservations, Bills), auth flows, i18n, PWA, security, phase roadmap | ✅ Done | — |
| `ARCHITECTURE.md` | System design + Mermaid diagrams + deployment | Visual diagrams: full system, data flow, auth flow, bills pipeline. API contracts, service dependencies, Vercel + Supabase deployment pipeline | ❌ Not started | Architect |
| `BACKEND.md` | Backend conventions and rules | Edge Function structure and naming, RLS policy patterns per table, Supabase client usage rules, pg_cron setup, error handling strategy, API response formats | ❌ Not started | Architect |
| `SECURITY.md` | Actionable security rules for agents | Token storage rules ("never localStorage"), RLS enforcement checklist, signed URLs for Storage, OAuth token handling, invite code rules, input sanitization requirements | ❌ Not started | Security |
| `ENV.md` | Environment variables + credentials guide | Every env var the app needs, where to obtain it, which service it belongs to (e.g. `VITE_SUPABASE_URL` → Supabase dashboard → Project Settings). Never stores actual values — names and descriptions only | ❌ Not started | Architect |
| `UI_DESIGN_SYSTEM.md` | All frontend visual and interaction rules | Shared components (Button, Card, Modal, Input, Badge), design tokens (Burgundy/Mint colors, spacing scale, typography, shadows, border radius), layout rules (nav bar, hub grid, mobile-first breakpoints), interaction patterns (loading, empty, error states) | ❌ Not started | Frontend |
| `SCREENS.md` | Static HTML mockups per screen | One `.html` file per screen, openable in browser — Shopping Hub grid, Active List, Task Hub, Bill Card, Settings, Auth screen, etc. Produced by UX/UI agent as visual reference for coding polecats | ❌ Not started | UX/UI Designer |
| `CLAUDE.md` | Agent rules + startup reading list by role | Naming conventions, file structure, git workflow, agent permissions, coding conventions (no inline styles, no `any`, RTL logical properties, i18n required). Includes role-specific reading lists (see below) | ❌ Not started (v1 exists, needs full rewrite for v2) | Architect |

---

## CLAUDE.md — Role-Specific Reading Lists

When the Architect writes `CLAUDE.md`, it must include a section like this so each polecat knows exactly what to read before touching code:

```
## Architect — read before starting:
- PRD_v3.md (full)
- ARCHITECTURE.md (full)

## Backend Agent — read before starting:
- PRD_v3.md → sections: Tech Stack, Database Schema, Auth, Integration Privacy Model, Bills
- ARCHITECTURE.md (full)
- BACKEND.md (full)
- SECURITY.md (full)
- ENV.md (full)

## Frontend Agent — read before starting:
- PRD_v3.md → sections: Vision, Glossary, Tech Stack, all Hub specs, i18n, PWA, Coding Conventions
- UI_DESIGN_SYSTEM.md (full)
- SCREENS.md → your assigned screen(s)
- SECURITY.md (full)

## UX/UI Designer — read before starting:
- PRD_v3.md → sections: Vision, Glossary, all Hub specs, Settings, i18n
- UI_DESIGN_SYSTEM.md (full, if already written)

## Security Agent — read before starting:
- PRD_v3.md → sections: Auth, Integration Privacy Model, Security
- ARCHITECTURE.md (full)
- BACKEND.md (full)

## QA Agent — read before starting:
- PRD_v3.md (full)
- ARCHITECTURE.md (full)
- UI_DESIGN_SYSTEM.md (full)
- SCREENS.md (full)
```

---

## Mayor Instructions

Before starting any coding wave:
1. Verify all documents above are marked ✅ Done
2. If any document is ❌ Not started — spawn the responsible agent to produce it first
3. All documents must be reviewed and approved by the human owner before coding begins
4. Update the Status column in this file as documents are completed

**No coding polecat should be spawned until every document is ✅ Done.**
