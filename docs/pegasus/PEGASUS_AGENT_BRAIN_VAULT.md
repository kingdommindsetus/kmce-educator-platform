# Pegasus Agent Brain Vault — Oct 2 Launch Baseline

**Canonical system name: PEGASUS.** Legacy NERVS references are compatibility/migration debt only.
Canonical names: **IRIS** (legacy Eyes) and **Evan** (legacy Eve).

## Operating model
KMCE is the first AI-operated dental education company running on Pegasus. Pegasus is the governed operating system that coordinates people, AI offices, workflows, tools, approvals, knowledge, evidence, analytics, educators, clients, courses, sales, service, design, documents, communications and commerce.

## Agent brain registry
| Office | Sources | Job |
|---|---|---|
| PEGASUS | Activepieces patterns, Hermes, ECC, Neon, Composio, Plane | orchestration, durable jobs, work tracking, approvals, state, evidence |
| Simon — Executive Command | OpenExecutive; ivfarias/ceo; Plane | analyze objectives, decompose, delegate, prioritize, verify, escalate, executive reporting |
| Marie — Operations | OpenExecutive; Activepieces patterns; Plane; Chatwoot | triage, queues, deadlines, service operations, follow-up, cross-office coordination |
| IRIS — Intelligence/Observability | Arize Phoenix; Promptfoo; DeepEval; Argent | traces, evaluations, regressions, application QA, anomalies |
| Mark — Marketing | digital-marketing-pro; Growth OS; listmonk | positioning, marketing strategy, SEO/GEO, newsletters and acquisition |
| Cammy — GTM/Campaigns | GTM Strategy AI Research Assistant; Growth OS; listmonk | market/audience research, campaign construction, email campaign ops, economics |
| Evan — Brand/Content | ThreadForge; Penpot; Canva Developer Agent Kit; InvokeAI | narrative, content systems, brand assets, visual concepts, editable campaign creative |
| Tube — Video | youtube-automation-agent; Voicebox; Canva Developer Agent Kit | video research, scripts, narration/voice assets, metadata, channel workflow |
| Lucy — Social Distribution | Ayrshare; BrightBean Studio; Pinterest Growth Agent; Canva Developer Agent Kit | scheduling, channel adaptation, campaign asset handoff, Pinterest loop, distribution feedback |
| Snake — Growth Analytics | Neptune Marketing; Growth OS | funnel measurement, conversion, growth and verified ROI signals |
| Alice — Commerce | Medusa; Shopify AI Toolkit; Shopify agent skills; nasa8x/printify-api; Canva Developer Agent Kit | catalog/store QA, merchandising, product imagery, Printify draft/order/fulfillment workflows |
| Echo — Sales | OpenOutreach concepts; dentist-finder/Scout data; Chatwoot; listmonk | qualify, personalize, outreach/follow-up, inbox/conversation handling; sends policy-gated |
| Booker — Scheduling | appointment-agent; open-schedule-agent; Chatwoot | availability, timezone, calendar, reminders, conversation-to-booking handoff |
| Documents / Agreements | Documenso | document preparation/signing integration pattern, agreement workflow and evidence trail |
| Design Infrastructure | Penpot | design systems, design tokens, prototypes, design-to-code/MCP workflow |
| Customer Communications | Chatwoot | shared inbox, conversations, support/sales handoffs and customer history |
| Work Management | Plane | projects, issues, cycles/work tracking and execution visibility |
| Campaign Messaging | listmonk | newsletters, subscriber lists, campaigns and delivery operations |
| Visual Generation | InvokeAI | image generation/refinement/workflows and creative asset production |
| Canva Infrastructure | Canva Developer Agent Kit | branded editable multi-format designs, SDK/MCP integration patterns |
| Voice Infrastructure | Voicebox | local-first TTS/voice synthesis for approved voice assets and narrated content |


### KMCE Content Intelligence Engine — marketing intelligence operating system
Repository: https://github.com/kingdommindsetus/KMCE-Content-Intelligence-Engine

Private KMCE-built application providing Market Radar, Competitor Intelligence, Content Opportunities, Content Queue, Faculty Content, KMCE Performance, Revenue Attribution, Simon strategy, and weekly intelligence reporting.

Primary Pegasus consumers: **Simon, Mark, Cammy, Evan, Lucy, Snake, IRIS**.

Canonical flow:
**MARKET SIGNAL → SIMON ANALYSIS → ORIGINAL KMCE ANGLE → COMMERCIAL DOOR → CONTENT BRIEF → PRODUCTION → FOUNDER APPROVAL → DISTRIBUTION → PERFORMANCE → LEAD/OPPORTUNITY/SALE → REVENUE ATTRIBUTION → IRIS VERIFICATION → SIMON LEARNING**

Integration rule: treat this repository as a specialized department application and capability provider, not a second source of truth for company-wide tasks. Pegasus remains the orchestration/evidence/approval layer. Operational content data should be synchronized into Neon/Pegasus via explicit adapters; do not rely on UI seed data as verified business truth.

Current code inspection:
- React 19 + Vite frontend with Express server.
- Simon endpoints for chat, competitor analysis and production-brief generation.
- Typed commercial doors, content families, opportunity records, queue records, performance metrics and revenue attribution records.
- Current server includes fallback/sample metrics and generated examples; these are **DEMO DATA**, not verified KMCE production facts.
- Current Gemini integration is local to this app. When connected to Pegasus, Simon executive commands should be routed through Pegasus governance rather than allowing this app to become an independent executive authority.

## New final integration batch

### Penpot — design infrastructure
Repository: https://github.com/penpot/penpot

Use as the design-system and design-to-code layer for Pegasus/KMCE UI work. Penpot provides real-time collaboration, design tokens, components/variants, inspectable SVG/CSS/HTML, API/webhooks and MCP-oriented design workflows. Primary consumers: **Evan, Alice, Marie, Pegasus product UI**.

**Launch use:** reference design tokens/components and interface workflow patterns; do not fork wholesale into Pegasus. License is MPL-2.0, so keep compliance boundaries explicit.

### Plane — company work-management layer
Repository: https://github.com/makeplane/plane

Use Plane patterns for projects, issues, cycles, work queues and team visibility. Primary consumers: **Pegasus, Simon, Marie**. It gives the AI company a human-readable operating board instead of hiding all work in agent chat.

**Launch use:** map Pegasus task contracts to visible work states and founder-facing operational boards.

### Voicebox — voice synthesis layer
Repository: https://github.com/jamiepine/voicebox

Local-first voice synthesis and voice-cloning studio with multiple TTS engines, effects and multi-voice composition. Primary consumers: **Tube** and approved agent voice experiences.

**Policy:** voice cloning requires explicit authorization/consent for the voice being cloned. No deceptive impersonation. For Oct 2, use only authorized/synthetic voices.

### Chatwoot — customer conversation layer
Repository: https://github.com/chatwoot/chatwoot

Use Chatwoot patterns as the shared conversation/inbox layer for leads, doctors, students and clients. Primary consumers: **Echo, Booker, Marie**, with Simon receiving escalations.

**Launch use:** conversation model, assignment/handoff, status, history and escalation patterns. Community code outside enterprise-specific areas is MIT; enterprise portions have separate terms.

### Documenso — documents and signing
Repository: https://github.com/documenso/documenso

Use as an integration/reference layer for agreements, signatures, status and document evidence. Primary consumers: **Marie, Simon, educator/client onboarding**.

**License rule:** Community Edition is AGPL-3.0; proprietary SaaS modifications/network use can create source-disclosure obligations. Prefer **API integration or properly licensed deployment**, not copying Documenso source into proprietary Pegasus.

### listmonk — newsletters and campaign delivery
Repository: https://github.com/knadh/listmonk

Use for subscriber/list/newsletter/campaign-delivery concepts and integrations. Primary consumers: **Mark, Cammy, Echo**.

**Launch use:** campaign/list architecture and controlled newsletter workflow. External sends remain approval/policy gated.

### InvokeAI — visual generation engine
Repository: https://github.com/invoke-ai/InvokeAI

Use as the visual-generation/refinement workflow layer for campaign imagery, course artwork, storefront creative and visual experimentation. Primary consumers: **Evan, Alice, Lucy, Mark**.

**Launch use:** reference/workflow integration, not bundle GPU-heavy runtime into the Oct 2 web app. Apache-2.0 project license verified in uploaded source.

### Canva Developer Agent Kit — branded asset infrastructure
Repository: https://github.com/canva-sdks/canva-developer-agent-kit

Use for agent-facing Canva integration patterns and branded multi-format assets: decks, social graphics, posters, event materials, reports, certificates, thumbnails and campaign kits. Primary consumers: **Evan, Lucy, Alice, Tube, Mark**.

Important: some repo recipes intentionally contain stubbed generation hooks and explicitly say to check current Canva capability availability. Do not mark a Canva function LIVE until the required SDK/MCP/API endpoint is actually connected and tested.

## Canonical company loops

### Educator / doctor
LEAD OR REFERRAL → ECHO/MARIE → PROFILE + DOCUMENTS → DOCUMENSO SIGNATURE STATUS → COURSE/CE WORK → MARK/CAMMY CAMPAIGN → EVAN/TUBE/LUCY CREATIVE → REGISTRATIONS → SNAKE METRICS → SIMON EXECUTIVE VIEW

### Client / prospect
INQUIRY → CHATWOOT CONVERSATION → ECHO QUALIFY → BOOKER SCHEDULE → SIMON/MARIE ROUTE → SERVICE DELIVERY → DOCUMENTS/APPROVALS → FOLLOW-UP → VERIFIED REVENUE SIGNAL

### Creative campaign
MARK STRATEGY → CAMMY CAMPAIGN → EVAN DESIGN BRIEF → PENPOT/CANVA/INVOKE ASSET WORKFLOW → TUBE VOICE/VIDEO → LUCY DISTRIBUTE → LISTMONK EMAIL WHEN APPLICABLE → SNAKE MEASURE → IRIS VERIFY

### Founder command
EVENTS + TASKS + CONVERSATIONS + DOCUMENTS + CAMPAIGNS + COMMERCE + VERIFIED METRICS → PEGASUS → SIMON BRIEF → FOUNDER APPROVALS/DECISIONS

## Canonical loop
FOUNDER OBJECTIVE → SIMON → PEGASUS TASKS → SPECIALISTS → IRIS VERIFY → APPROVAL WHEN REQUIRED → ACTION → EVIDENCE → STATE/MEMORY → SIMON REPORT

## Safety/authority
No secret or customer data belongs in this registry. Public source code is not copied merely because it is public; license/security review precedes reuse. External sends, publishing, destructive commerce actions, financial actions, voice cloning, document execution and sensitive changes remain Pegasus policy/approval gated. DONE requires evidence.
