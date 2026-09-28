# KMCE AI Operating System — Launch Runbook v1

## Launch objective

Run the Founder Command Center as a live KMCE operating system with deterministic authority boundaries, auditable AI work, durable operational state, and clear provider/configuration status.

## Launch order

1. Verify latest `main` deployment is READY.
2. Open Founder Command Center and inspect Launch Readiness.
3. Confirm no BLOCKED schema/accounting checks.
4. Review ATTENTION items, especially dead autonomy jobs.
5. Configure required production secrets/providers.
6. Run Founder-authenticated autonomy tick manually once.
7. Confirm a new autonomy run is recorded and no unexpected DEAD jobs appear.
8. Sync canonical Obsidian knowledge.
9. Verify knowledge search returns expected KMCE material.
10. Configure optional external providers one at a time and re-check readiness.
11. Run end-to-end operational proof on a controlled test lead.
12. Clean synthetic/test records before public demo.

## Required for unattended autonomy

- `AUTONOMY_WORKER_SECRET`

Cron is configured hourly at `/api/autonomy/tick`. The route accepts Founder auth for manual proof and a bearer secret for unattended execution.

## Required for Stripe accounting automation

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Successful payment intents can record balanced payment-receipt journals and create paid entitlements when valid service metadata is present.

## Optional provider activations

### Scout web intelligence
- `FIRECRAWL_API_KEY`

### OmniRoute model gateway
- `OMNIROUTE_BASE_URL`
- `OMNIROUTE_API_KEY`
- optional `OMNIROUTE_MODEL`

### Relationship provider
- `GRAPHIFY_BASE_URL`

### Procedure provider
- `ECC_BASE_URL`

Provider readiness is shown in the Founder UI. Missing optional providers are configuration gaps, not code failures.

## Authority boundaries

Autonomous internal work:
- queue/dedupe specialist tasks;
- detect due follow-up work;
- detect onboarding-ready work;
- create executive briefing tasks;
- detect active growth campaigns without content;
- retry recoverable internal jobs.

Approval/policy gated:
- outbound email/text;
- social publishing;
- external document requests;
- payment requests/refunds;
- external calendar bookings unless policy permits;
- entitlement release / CE issuance according to policy/evidence;
- revenue recognition requires fulfillment evidence.

Forbidden:
- self-expanding authority;
- changing banking destinations/security credentials;
- signing contracts as Kimberly/KMCE;
- deleting audit/accounting history;
- rewriting historical ledger entries.

## Launch failure conditions

Treat launch as BLOCKED if any of these occur:
- critical schema table missing;
- unbalanced ledger journal;
- production deployment ERROR;
- required auth/Founder access broken;
- autonomy worker creates unexpected external effects;
- exact-draft approval protection fails;
- CE certificate can issue without eligibility evidence.

Treat as ATTENTION, not necessarily blocked:
- dead autonomy jobs;
- optional provider missing;
- pending Founder approvals;
- no external publishing/send provider configured.

## Production proof scenario

Use one controlled test lead and prove:

```
Scout discovery
→ Claire evidence/provenance
→ Atlas qualification
→ Maven draft
→ Gatekeeper exact approval
→ Echo eligibility
→ Booker discovery
→ Flow onboarding
→ Ledger payment/entitlement
→ Delivery/CE completion evidence
→ Sofia growth task visibility
→ Simon/Marie executive state
```

External sending or financial movement is not required to prove the internal operating system.
