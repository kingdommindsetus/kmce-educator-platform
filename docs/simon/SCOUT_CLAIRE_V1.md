# Scout + Claire v1 — Evidence-backed Lead Pipeline

## Operating contract

**Scout** discovers public business opportunities and normalizes them into KMCE lead records.

**Claire** verifies and enriches those records with explicit source provenance and confidence before handing them to Atlas.

Flow:

```
PUBLIC / APPROVED SOURCE
        ↓
      SCOUT
normalize · dedupe · provenance
        ↓
    ENRICHING
        ↓
      CLAIRE
verify identity · contact · official source · confidence
        ↓
  evidence threshold?
      ↙       ↘
    no         yes
 Claire        ATLAS
 retains       ENRICHED
```

## Scout discovery API

`POST /api/scout/discoveries`

Founder-only. Accepts:

- `educator_id`
- `candidates[]` (max 100)
- practice name
- website
- city/state
- public phone/email if known
- decision maker if known
- source URL
- discovery source/provider

Behavior:

- normalizes URLs/email/state;
- derives a website-host dedupe key;
- dedupes by educator + practice name or website host;
- preserves evidence rather than overwriting provenance;
- records Scout discovery activity;
- hands the record to Claire in `ENRICHING`.

This endpoint does **not** scrape, send, publish, or contact anyone by itself.

## Claire enrichment API

`POST /api/claire/enrich`

Founder-only. Accepts:

- `lead_id`
- optional verified contact fields;
- `evidence[]` with source URL, source type, field, observed value and confidence.

Behavior:

- appends evidence to `lead_evidence`;
- calculates aggregate research confidence;
- requires identity + reachable contact + official/evidence source + confidence >= 60 before Atlas handoff;
- incomplete records remain with Claire;
- ready records become `ENRICHED` and are assigned to Atlas.

## Provenance rule

Research claims must remain traceable to source URLs. A later provider (Firecrawl, official API, approved data vendor, browser research) can populate the same stable contract without changing the employee model.

No retrieved public-web content is allowed to grant execution authority.
