# KMCE × Paperclip Integration

Paperclip is deployed as a separate orchestration service. KMCE remains the business system of record for CRM, CE/course controls, revenue planning, PEGASUS conversations, and founder approval gates.

## Role split

- **Paperclip:** org chart, goals, task assignment, atomic checkout, heartbeats, budgets, run history, governance, schedules.
- **KMCE/PEGASUS:** Simon and the 11 specialist agents, company-specific CRM/CE logic, business records, founder command center, external-action gates.

## First bridge

Paperclip HTTP adapter -> `POST /api/paperclip/heartbeat`

Header:

`Authorization: Bearer <PAPERCLIP_BRIDGE_SECRET>`

Paperclip heartbeat body is accepted in its native form:

```json
{
  "runId": "...",
  "agentId": "echo",
  "companyId": "...",
  "context": {
    "taskId": "...",
    "title": "Follow up with qualified practice",
    "instruction": "Prepare the approved follow-up draft."
  }
}
```

The bridge maps the Paperclip agent to the canonical PEGASUS name, creates/deduplicates a KMCE `agent_tasks` row with source `PAPERCLIP`, and writes an audit event.

## Canonical agent keys

`simon marie eyes mark cammy eve tube lucy snake alice echo booker`

Display mapping keeps `eve` as the stable internal key for **Evan**.

## Safety

Paperclip does not bypass KMCE gates. External sends, publishing, payments, CE authorization, destructive actions, and other consequential operations remain controlled by existing KMCE policy/Founder approval.

## Deployment recommendation

Do not vendor the Paperclip monorepo into the KMCE Next.js application. Run Paperclip separately with its own Postgres/runtime and connect it to KMCE via HTTP/API. This avoids coupling Paperclip's Node/pnpm monorepo, embedded/server runtime, migrations, and UI build to the KMCE Vercel app.
