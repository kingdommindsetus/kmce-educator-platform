# Kingdom Mindset CE — AI Operating System

KMCE's Founder Command Center and operating system for dental continuing education, educator commercialization, lead intelligence, controlled outreach, discovery, onboarding, revenue workflows, and auditable AI operations.

## Operating rule

**Finish → Prove → Systemize → Scale**

## Production architecture

- **Frontend + API:** Next.js App Router / TypeScript
- **Operational state:** Neon PostgreSQL
- **Deployment:** Vercel
- **Executive control:** Simon + Marie
- **AI workforce:** Scout, Claire, Atlas, Maven, Gatekeeper, Echo, Booker, Flow, Ledger, Sofia, Delivery/CE
- **Autonomy layer:** durable jobs, events, idempotency, retries, worker-run audit, approval boundaries
- **Authority:** AUTO / CONTROLLED / POLICY / APPROVAL / FORBIDDEN

## Current operating flow

```
Kimberly
  ↓
Simon
  ↓
Marie
  ↓
Scout → Claire → Atlas → Maven → Gatekeeper → Echo → Booker → Flow → Ledger
```

External communications, financial actions, contract/signature actions, permission changes, and other high-impact operations remain approval/policy gated.

## Data and safety rules

- Never invent credentials, contact data, dates, tuition, CE hours, or outcomes.
- Preserve provenance for researched lead/contact facts.
- No outbound communication without required approval.
- No autonomous authority escalation or security/credential changes.
- Historical audit/accounting records are append-only; corrections use new records.
- Founder/admin has cross-educator operational visibility.
- AI actions must be attributable, auditable, idempotent where appropriate, and retry-safe.
- Production dashboards use real operational state rather than fabricated metrics.

## Autonomy

The autonomy worker scans live state for due internal work, queues specialist tasks, records events/results, and retries safe failures. Vercel Cron is configured to call `/api/autonomy/tick` hourly.

Before unattended production activation, configure a strong `AUTONOMY_WORKER_SECRET` / Cron secret in the deployment environment. The worker accepts Founder authentication for manual testing and bearer-secret authentication for scheduled execution.

Autonomy never overrides capability authority: external sends, publishing, payments/refunds, and other gated capabilities wait for approval/policy instead of executing automatically.
