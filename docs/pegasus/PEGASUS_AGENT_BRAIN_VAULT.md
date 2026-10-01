# Pegasus Agent Brain Vault

Canonical product/system name: **PEGASUS**. Legacy `NERVS` references are migration aliases only.
Canonical agent names include **IRIS** (legacy: Eyes) and **Evan** (legacy: Eve).

This registry preserves the source projects and intended capability mappings used to design Pegasus agent brains. External repositories are references/inspirations unless their license and security posture explicitly permit code reuse. Do not commit credentials, customer data, or third-party proprietary assets here.

## Core workforce

| Agent/System | Office | Brain/capability sources | Intended contribution |
|---|---|---|---|
| PEGASUS | AI Workforce Operating System | Activepieces; Hermes; ECC; Neon; Composio | durable workflows, routing, tools, approvals, state, evidence |
| Simon | Executive Command | OpenExecutive; ivfarias/ceo | objective decomposition, specialist selection, parallel delegation, planning, verification, executive reporting |
| Marie | Executive Operations | OpenExecutive; Activepieces patterns | triage, task routing, follow-up, deadlines, escalation, cross-office coordination |
| IRIS | Intelligence & Observability | Arize-ai/phoenix; promptfoo/promptfoo; confident-ai/deepeval; Argent | traces, observability, evaluations, regression/QA evidence, anomaly detection |
| Mark | Marketing Director | indranilbanerjee/digital-marketing-pro; nocodework/growth-os | marketing strategy/SOPs plus grounded GA4/GSC/PageSpeed/GEO growth intelligence |
| Cammy | Campaign Strategy & Economics | iamAyushSaxena/GTM-Strategy-AI-Research-Assistant; Growth OS | GTM research, campaign construction, audience/market analysis, economics |
| Evan | Brand & Content Studio | zyadhajaji/threadforge | narrative/content systems and structured content transformation |
| Tube | Video / YouTube Studio | darkzOGx/youtube-automation-agent | video concepts, scripts, metadata, channel workflow and publishing preparation |
| Lucy | Social Media & Distribution | ayrshare/social-media-api; brightbeanxyz/brightbean-studio; Pinterest Growth Agent | multi-channel scheduling/distribution plus Pinterest research→generate→post→learn patterns |
| Snake | Growth & Analytics | horacio-pedro/neptune-marketing; nocodework/growth-os | funnel/growth measurement, live analytics, SEO/GEO, campaign and conversion feedback |
| Alice | Commerce & Storefront Quality | medusajs/medusa; Shopify AI Toolkit; Shopify agent skills; nasa8x/printify-api | Shopify/catalog/store QA plus Printify product/order/publish/shipping/webhook capabilities |
| Echo | Sales & Outreach | eracle/Open Outreach concepts; Scout/lead data | ICP, qualification, personalized outreach, follow-up/reply routing; sends remain approval-gated |
| Booker | Scheduling & Appointments | mjunaidca/appointment-agent; anthroos/open-schedule-agent | availability, timezone handling, calendar booking, reminders and conflicts |

## Newly reviewed source packs

### Growth OS
Uploaded source: `growth-os-main(2).zip`.
MIT-licensed Python project described as an open-source Growth OS for AI agents. Useful portable skills: onboard, context, audit, GEO audit/content, connect, delegate, dashboard. Read-side adapters include GA4, Google Search Console, PageSpeed, MailerLite, with approval-gated integrations documented for other services. It supports CLI and MCP patterns and documents Hermes integration.

**Pegasus mapping:** primarily Mark + Snake, with IRIS consuming the evidence. Mark uses business context, audit and delegation playbooks; Snake uses grounded live metrics and dashboard/adapters. Never fabricate metrics when an account is not connected.

### Pinterest Growth Agent
Uploaded source: `Pinterest_Growth_Agent_core-main(2).zip`.
Implements a Research → Generate → Post → Learn → Repeat loop with trend/keyword discovery, image + metadata generation, quality gates, Pinterest worker, scheduler, safety manager, engagement feedback, reporting, persistence and self-healing.

**Pegasus mapping:** Lucy owns Pinterest distribution/workflow; Evan supplies brand/content direction; Snake consumes engagement/performance feedback; IRIS observes failures. Browser automation/anti-detection behavior is not automatically adopted; prefer authorized APIs and Pegasus approval/safety policies.

## Source registry

- https://github.com/ivfarias/ceo
- OpenExecutive (uploaded source)
- https://github.com/Arize-ai/phoenix
- https://github.com/promptfoo/promptfoo
- https://github.com/confident-ai/deepeval
- Argent (uploaded source)
- https://github.com/activepieces/activepieces
- Hermes agent runtime candidate
- ECC skills/verification layer
- https://github.com/indranilbanerjee/digital-marketing-pro
- https://github.com/nocodework/growth-os
- https://github.com/iamAyushSaxena/GTM-Strategy-AI-Research-Assistant
- https://github.com/zyadhajaji/threadforge
- https://github.com/darkzOGx/youtube-automation-agent
- https://github.com/ayrshare/social-media-api
- https://github.com/brightbeanxyz/brightbean-studio
- Pinterest Growth Agent (uploaded source)
- https://github.com/horacio-pedro/neptune-marketing
- https://github.com/medusajs/medusa
- Shopify AI Toolkit (uploaded source)
- Shopify agent skills (uploaded source)
- https://github.com/nasa8x/printify-api
- Open Outreach (uploaded/source reference)
- https://github.com/mjunaidca/appointment-agent
- https://github.com/anthroos/open-schedule-agent
- dentist-finder-chatbot (KMCE Scout/Echo lead-discovery concept)

## Authority rules

1. Pegasus is the orchestration/execution system; agents are specialized offices.
2. Simon delegates; he does not fabricate execution evidence.
3. IRIS observes/evaluates; she does not silently change production configuration.
4. External sends, destructive commerce actions, publishing, financial actions, and other sensitive changes require the applicable Pegasus policy/approval gate.
5. A task is not DONE until evidence satisfies its completion contract.
6. Secrets stay in approved credential stores/environment configuration and are never committed.
7. Third-party source code is not copied into proprietary Pegasus merely because it is public. License/security review comes first.
8. Legacy names NERVS/Eyes/Eve remain compatibility aliases only until safely migrated.

## Canonical execution loop

FOUNDER OBJECTIVE → SIMON ANALYZE/DECOMPOSE → PEGASUS CREATE/ROUTE TASKS → SPECIALIST EXECUTION → IRIS/QA VERIFY → HUMAN APPROVAL WHEN REQUIRED → ACTION → EVIDENCE/AUDIT → MEMORY/STATE UPDATE → SIMON REPORT

