# Expert dashboard and sent-history usability

Original task: 019f69a6-3d7c-7ff1-99d2-24bebb2745ee, Blake / old-leads-node.

The live Dashboard remained on an all-page skeleton while any of five queries
was loading. The page now renders navigation and available data independently.
Pending metrics are labelled Loading, not passed off as zero; unavailable email
metrics are labelled Unavailable. Read requests have a 20-second timeout;
mutation requests retain their existing behaviour and supplied signals win.

Dashboard prominently links to the existing Conversations page. That page keeps
all reply/draft approval controls and message previews, adds recipient/company/
subject search and campaign filtering, sorts sent threads by latest activity,
and separates permission requests from marketing steps. Its badge explicitly
counts conversation threads, not delivered emails or unique recipients. A status
such as unsubscribed alone is no longer sufficient to claim a sent message:
the summary must have a positive outbound message count.

Verification: production loading issue reproduced, static build/predeploy check
passed, focused ESLint passed with pre-existing formatting/any rules disabled,
TypeScript before 41 / after 41 / no introduced diagnostics. Full-project lint
and typecheck are not green. No backend, cron, contact, recipient, permission,
suppression, budget or send schedule changed. Prior assets/uploads retained.

Follow-up: the completed-contact CSV export requested separately still requires
verification; this release does not claim that action works.
