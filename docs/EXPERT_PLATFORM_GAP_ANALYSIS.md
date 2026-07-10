# Expert Technology Solutions Platform Gap Analysis

## What Is Working

- Static frontend build is working with `npm run build:static`.
- Static VPS deployment path is known and repeatable.
- `.env.static` is correctly pointing the frontend to `https://api.intergrai.co.za`.
- Dashboard page is live-data aware and reads from the Intergrai Leads API.
- Leads page is live-data aware and supports filtering, refresh, pagination, and CSV export.
- Campaigns page is live-data aware and displays campaign status plus brief text.
- Placeholder pages are being used to avoid exposing unfinished admin/chat functionality as if it were production-ready.
- Current route tree does not expose an active `/agent` page.

## What Is Partially Working

- Login exists, but it is a temporary frontend-only access gate and not real production authentication.
- Roles exist only as local frontend state and are inferred from the email string.
- Dashboard is API-backed, but client-facing KPI wording and approval semantics still need final validation.
- Leads data is API-backed, but operational status handling, comments, and test-record governance are not complete.
- Campaign data is API-backed, but live campaign setup and approval governance still need product/ops signoff.
- Settings page exists as a placeholder, which is safer than exposing fake controls, but it is not an operational admin surface.
- Request/chat positioning exists as placeholder content under `/updates`, but there is no authenticated request workflow yet.

## What Is Missing

- Real login/auth/users/roles
- Persistent user management and invitations
- Secure backend-enforced access control
- Real campaign setup workflow and campaign ownership controls
- Lead comments, lead-status lifecycle management, and test lead handling
- Request/Agent system behind login
- Intergrai admin inbox UI
- Email draft/approval module
- Outreach automation and reply capture
- Client handover walkthrough and operator runbook signoff

## Recommended Build Order

1. Login/auth/users/roles
   Replace the temporary email gate and local role inference with real authentication and backend-enforced permissions.
2. Real campaign setup
   Finalize the live campaign model, brief ownership, approval rules, and campaign edit surface.
3. Leads statuses/comments
   Connect or implement real lead workflow statuses, comments, test markers, and cleanup rules.
4. Request/Agent system behind login
   Add a secure request workflow only after auth and permissions are in place.
5. Intergrai admin inbox UI
   Build the internal operator view for requests, approvals, and client interventions.
6. Email draft/approval module
   Add draft creation, review states, and explicit approval history.
7. Outreach automation/reply capture
   Add the automation layer only after data integrity, approvals, and inbox visibility are stable.

## Delivery Constraint Summary

- Do not reintroduce the broken `/agent` experimental UI.
- Do not break static VPS deployment.
- Do not expose keys or secrets.
- Do not add AI/model calls during this phase.
