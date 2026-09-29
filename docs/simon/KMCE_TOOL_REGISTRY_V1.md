# KMCE Tool Registry v1

This registry turns external APIs and MCP servers into bounded KMCE capabilities. OpenJarvis and Simon may discover tools through this contract, but they do not receive unrestricted credentials or arbitrary execution rights.

## Rules

- Read-only discovery/research may run automatically when the capability is AUTO.
- CONTROLLED tools may run only inside a known KMCE workflow and must persist evidence/results.
- APPROVAL tools create an external side effect and require founder/policy approval.
- Production agents do not receive unrestricted shell, filesystem, payment, send, publish, or calendar-write authority.
- Provider secrets remain server-side environment variables.

## Initial providers selected from the API mega list

- DentalPlans.com Dentist Scraper
- Contact Info Scraper
- Bulk Email Verifier
- Bulk Phone Validator
- Academic Research MCP
- YouTube MCP
- E-Commerce / Shopify Intelligence MCP
- Website quality audit provider
- Google Calendar MCP
- Course quiz generator
- Safe code sandbox

## Agent routing

- Simon: orchestration, research, sandboxed analysis
- Scout / Eyes / Claire: dentist discovery and enrichment
- Booker: availability + approval-gated booking
- Alice / Sofia: website quality audits
- Tube: YouTube research/transcripts
- Eve / Snake: Shopify intelligence
- Delivery/CE / Claire: scholarly research + quiz drafting

## Next implementation gate

Do not add provider credentials until each tool has:
1. a concrete input schema,
2. an output normalization schema,
3. a persistence target,
4. an authority check,
5. an audit event.

The registry is the allowlist; anything not listed is unavailable to production agents.
