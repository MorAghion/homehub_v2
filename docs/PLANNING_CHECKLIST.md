# HomeHub v2 — Planning Checklist

This file is the source of truth for all documents that must exist before coding begins.
The Mayor and Architect must verify every document is complete and approved before spawning coding polecats.

---

## Document Registry

All documents live in `docs/` at the repo root. Agents write to this folder. HTML screen mockups live in `docs/screens/`.

| Document | Path | Consists of | Details & Examples | Status | Responsible Agent |
|----------|------|-------------|-------------------|--------|-------------------|
| `PRD_v3.md` | `docs/PRD_v3.md` | Product requirements, system architecture, data models, feature specs, roadmap | Vision, glossary, tech stack, schema, all hub specs (Shopping, Tasks, Vouchers, Reservations, Bills), auth flows, i18n, PWA, security, phase roadmap | ✅ Done | — |
| `ARCHITECTURE.md` | `docs/ARCHITECTURE.md` | System design + Mermaid diagrams + deployment | Visual diagrams: full system, data flow, auth flow, bills pipeline. API contracts, service dependencies, Vercel + Supabase deployment pipeline | ✅ Done | Architect |
| `BACKEND.md` | `docs/BACKEND.md` | Backend conventions and rules | Edge Function structure and naming, RLS policy patterns per table, Supabase client usage rules, pg_cron setup, error handling strategy, API response formats | ✅ Done | Architect |
| `SECURITY.md` | `docs/SECURITY.md` | Actionable security rules for agents | Token storage rules ("never localStorage"), RLS enforcement checklist, signed URLs for Storage, OAuth token handling, invite code rules, input sanitization requirements | ✅ Done | Security |
| `ENV.md` | `docs/ENV.md` | Environment variables + credentials guide | Every env var the app needs, where to obtain it, which service it belongs to (e.g. `VITE_SUPABASE_URL` → Supabase dashboard → Project Settings). Never stores actual values — names and descriptions only | ✅ Done | Architect |
| `UI_DESIGN_SYSTEM.md` | `docs/UI_DESIGN_SYSTEM.md` | All frontend visual and interaction rules | Shared components (Button, Card, Modal, Input, Badge), design tokens (Burgundy/Mint colors, spacing scale, typography, shadows, border radius), layout rules (nav bar, hub grid, mobile-first breakpoints), interaction patterns (loading, empty, error states) | ✅ Done | Frontend |
| `FRONTEND.md` | `docs/FRONTEND.md` | Application-level shared component patterns | Which components are shared vs hub-specific. Shared component names + props interface + slot/content injection pattern. Patterns: Edit Mode (bulk select, delete, reorder), Add/Create modal (custom fields per hub), Sub-Hub management (create, rename, delete), Hub grid (sub-hub cards + FAB), Detail modal (Vouchers, Reservations). State management patterns (how edit mode is toggled, how modals receive data). File structure: where shared components live (`src/components/shared/` vs `src/components/hub/`). Must be written after `UI_DESIGN_SYSTEM.md` and before `SCREENS.md`. | ✅ Done | Frontend |
| `SCREENS.md` | `docs/SCREENS.md` + `docs/screens/*.html` | Static HTML mockups per screen | One `.html` file per screen in `docs/screens/`, openable in browser — Shopping Hub grid, Active List, Task Hub, Bill Card, Settings, Auth screen, etc. `SCREENS.md` is an index listing all screens with descriptions. Produced by UX/UI agent as visual reference for coding polecats. **Depends on `FRONTEND.md` being complete** — shared components must be defined before mockups are drawn. | ✅ Done | UX/UI Designer |
| `CLAUDE.md` | `docs/CLAUDE.md` | Agent rules + startup reading list by role | Naming conventions, file structure, git workflow, agent permissions, coding conventions (no inline styles, no `any`, RTL logical properties, i18n required). Includes role-specific reading lists (see below) | ❌ Not started (v1 exists, needs full rewrite for v2) | Architect |

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
- FRONTEND.md (full)
- SCREENS.md → your assigned screen(s)
- SECURITY.md (full)

## UX/UI Designer — read before starting:
- PRD_v3.md → sections: Vision, Glossary, all Hub specs, Settings, i18n
- UI_DESIGN_SYSTEM.md (full)
- FRONTEND.md (full)

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
