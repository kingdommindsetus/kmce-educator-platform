# Simon Autonomy Core v1

## Purpose

Turn the KMCE agent workflow into an event-driven operating system while preserving Founder authority.

## Durable control plane

- `autonomy_jobs`: capability, owner, authority, status, idempotency, retry state, payload/result.
- `autonomy_events`: append-only operational evidence.
- `autonomy_runs`: worker execution summaries.
- `service_catalog`: machine-readable KMCE service/fulfillment definitions.

## Worker loop

Hourly Vercel Cron → `GET /api/autonomy/tick`.

On each tick Simon:

1. seeds/refreshes the service catalog;
2. scans due follow-ups;
3. scans eligible Gmail outreach threads for inbound replies;
4. detects onboarding cases ready for payment handoff;
5. ensures a daily executive-brief task exists;
6. atomically claims up to 20 due jobs;
7. evaluates capability authority;
8. executes internal-safe handlers;
9. parks approval/policy work rather than crossing the boundary;
10. retries recoverable failures with exponential backoff;
11. records job results and run summaries.

## Current autonomous internal actions

- create Echo follow-up review tasks when due;
- read eligible Gmail threads, dedupe inbound messages, classify replies, and route CRM state internally;
- create Ledger preparation tasks when onboarding is payment-ready;
- create Marie daily executive-brief tasks;
- create/dedupe generic internal agent tasks.

These actions do not contact external humans or move money. Reply sync is read-only against Gmail and writes only auditable CRM state.

## Security gate

Scheduled execution requires a strong deployment secret. Set `AUTONOMY_WORKER_SECRET` (or align it with the Vercel Cron secret configuration) before unattended production activation.

Manual Founder-authenticated worker runs remain available for proof/testing.

## Deliberately gated

- outreach send;
- social publish;
- external document request;
- payment request / refund;
- authority/security changes;
- contract signing;
- destructive audit/accounting mutation.

The company may run itself; it may not grant itself more authority.
