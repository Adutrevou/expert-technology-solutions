# Expert Technology Solutions Go-Live Checklist

## Current Confirmed Working Items

- Site is live again and reachable.
- Static VPS build path is confirmed with `npm run build:static`.
- Static environment override is confirmed in `.env.static`.
- Static build points the frontend to `https://api.intergrai.co.za`.
- Current safe deployment target is `/var/www/experttechnologysolutions.intergrai.co.za/`.
- Current safe deployment command is:
  `rsync -av --delete --exclude 'server/' --exclude 'uploads/' /root/expert-technology-solutions/dist/ /var/www/experttechnologysolutions.intergrai.co.za/`
- Dashboard is loading from the Intergrai Leads API instead of seeded local demo data.
- Leads page is loading from the Intergrai Leads API and supports filtering and CSV export.
- Campaigns page is loading from the Intergrai Leads API.
- `/agent` experimental UI is not active in the current route tree.
- Working branch: `stable-production-recovery`
- Latest confirmed working commit: `99f3c13` (`configure static build to use Leads API`)

## Must-Finish Before Client Handover

- Login/auth/users/roles
  Replace the temporary email-only frontend gate with real authentication, role checks, and managed user access.
- Dashboard client-ready data
  Validate that KPI names, counts, approval states, and empty states reflect the client’s actual reporting language and live records.
- Leads page real lead statuses and comments
  Add or connect real lead workflow fields so the page exposes operational statuses, comments, and test-record handling.
- Campaign page real campaign brief
  Confirm each live campaign has a client-approved brief, status, ownership, and updated metadata.
- Request/Agent system behind login
  Keep request/chat workflows hidden from public access until they are authenticated, audited, and tested.
- Email draft/approval module foundation
  Define the first safe approval workflow for outbound drafts before any production release of messaging features.
- Test lead cleanup or mark-as-test
  Remove test records from client-facing views or clearly mark them so reporting is not misleading.
- Client handover walkthrough
  Prepare a short admin/user walkthrough covering login, dashboard, leads, campaigns, approvals, and support escalation.

## Nice-To-Have After Handover

- Saved filters and exports for leads review workflows.
- Campaign drill-down pages with performance history.
- Admin inbox UI for Intergrai operations users.
- Better audit history for approvals, comments, and lead changes.
- Client-specific onboarding copy and help content.
- Safer rollback automation and deployment snapshots.

## Testing Checklist

- Run `npm run predeploy:check`.
- Run `npm run build:static`.
- Confirm `dist/index.html` exists after the build.
- Confirm the built output contains `https://api.intergrai.co.za`.
- Load `/`, `/leads`, and `/campaigns` locally from the generated static build if possible.
- Verify dashboard live counts load without fallback/demo copy.
- Verify leads filters, pagination, refresh, and CSV export behave correctly.
- Verify campaign cards render real campaign brief text and approval badges.
- Confirm login page still shows temporary-access messaging and does not imply secure production auth.
- Confirm settings and agent/request placeholder areas do not expose unfinished or misleading controls.
- Confirm no secrets, API keys, or private credentials are checked into the repo.

## Final Approval Checklist

- Client-approved user access model is documented.
- Client-approved campaign list and current lead status definitions are confirmed.
- Production test data is removed or clearly labeled.
- Deployment runbook is reviewed and available to the operator.
- Static deploy has been completed on the current branch or approved release commit.
- Browser smoke test on production has passed for `/`, `/leads`, and `/campaigns`.
- Client handover walkthrough is scheduled or recorded.
- Rollback command is ready before final go-live signoff.
