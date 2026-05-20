# Expert Technology Solutions Onboarding

## Project Identity

- Client name: Expert Technology Solutions
- Client slug: `expert-technology-solutions`
- Mode: Standalone Leads System
- Domain: `experttechnologysolutions.intergrai.co.za`
- Repo URL: `https://github.com/Adutrevou/expert-technology-solutions`
- Lovable URL: `https://apollo-pulse-84.lovable.app`
- Client agent name: `Expert Technology Solutions Lead Agent`

## Current App Snapshot

- Frontend stack: React 19 + Vite + TypeScript
- Routing: TanStack Router file-based routes in `src/routes`
- Runtime/build shape: TanStack Start/Lovable config with Cloudflare-oriented `wrangler.jsonc`
- State/data: mostly browser `localStorage` plus seeded demo data in `src/lib/demo-data.ts`
- Auth: demo-only local login flow in `src/routes/login.tsx` and `src/lib/app-state.tsx`
- Server/API route present: `src/routes/api/gmail.messages.ts`

## Structure Review

- Dashboard page: `src/routes/index.tsx`
- Leads page: `src/routes/leads.tsx`
- Campaigns page: `src/routes/campaigns.tsx`
- Meetings page: `src/routes/meetings.tsx`
- Progress page: `src/routes/progress.tsx`
- Reports page: `src/routes/reports.tsx`
- Email scripts page: `src/routes/email-scripts.tsx`
- Updates page: `src/routes/updates.tsx`
- Settings/admin page: `src/routes/settings.tsx`
- App shell/navigation: `src/components/app-shell.tsx`

## Capability Check

- Supabase integration: not present
- Supabase auth/RLS/schema wiring: not present
- Worker/API route: present for Gmail messages at `/api/gmail/messages`
- Leads dashboard pages: present
- Campaign pages: present
- Client settings/users area: partial
- Users area details:
  - settings page exists for admins
  - client switching exists in local state
  - no real user management backend
  - no invitation flow
  - no persisted auth provider

## Environment Expectations Found In Code

Current code references these server-side environment variables:

- `LOVABLE_API_KEY`
- `GOOGLE_MAIL_API_KEY`

Notes:

- These are only used by `src/routes/api/gmail.messages.ts`.
- No Supabase environment variables are referenced.
- No Apollo API environment variables are implemented yet, despite Apollo being mentioned in UI copy.

## Deployment Reality Check

- This repo is not production-ready as-is for a client onboarding handoff.
- The app still runs primarily on demo data and local storage.
- Login is not secure; any email can log in and admin access is inferred from `"admin"` in the email address.
- VPS deployment should wait until real auth, persistence, and integration decisions are confirmed.

## Missing Details Alan Must Provide

- Production authentication approach
  - placeholder: Supabase Auth, Clerk, custom auth, or another provider
- Whether this should remain a TanStack Start server app on VPS, or be adapted for another runtime
- Real lead data source
  - placeholder: Apollo, Supabase tables, internal CRM, CSV import, or mixed
- Gmail/API connector ownership and production credentials process
- Final client admin user list
- Final client viewer/user list
- Campaign naming conventions and first live campaign definitions
- Business timezone confirmation
  - default placeholder currently assumes `Africa/Johannesburg` / SAST
- Support contacts and escalation owner
- SSL/DNS readiness for `experttechnologysolutions.intergrai.co.za`

## Recommended Pre-Deployment Work

1. Replace demo login with real authentication.
2. Decide and implement persistent storage.
3. Confirm whether Supabase will be added; if yes, define tables, auth, and RLS separately.
4. Decide whether the Gmail route should remain active in production.
5. Add a production env template without secrets.
6. Add a runtime start strategy for VPS deployment.
7. Validate domain, reverse proxy, TLS, and process manager setup.

## Placeholder Status

This repo has been prepared with client-local documentation and config placeholders only. No secrets were added. No auth, RLS, or Supabase schema changes were made.
