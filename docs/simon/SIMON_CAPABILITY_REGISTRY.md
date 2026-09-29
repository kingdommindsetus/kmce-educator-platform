# Simon Brain v2 — Capability Registry

## Purpose

Simon is the executive operating brain. He delegates work through stable capability names rather than coupling KMCE to individual repositories, vendors, or model providers.

**Rule:** Agent = accountable business role. Open source / SaaS / connector = replaceable capability provider.

## Authority classes

| Class | Meaning |
|---|---|
| AUTO | Read, reason, search, classify, summarize, draft, recommend. |
| CONTROLLED | Internal writes that are reversible and auditable. |
| POLICY | May execute only when a deterministic KMCE policy explicitly permits it. |
| APPROVAL | Requires Kimberly/founder approval before external or financial effect. |
| FORBIDDEN | Simon and agents cannot perform this action. |

Permanent forbidden actions:
- grant or expand their own authority;
- change banking destinations or security credentials;
- sign contracts as Kimberly/KMCE;
- delete critical audit or accounting history;
- rewrite historical ledger entries instead of posting corrections/reversals.

## Executive hierarchy

- **Kimberly** — Founder / final human authority.
- **Simon** — Chief Operating Brain; prioritizes, resolves cross-department conflicts, delegates, and reports.
- **NERVS** — Neural Executive Routing & Verification System; the orchestration layer for routing, jobs, workflow state, verification, approvals, and audit evidence. NERVS is infrastructure, not an authority-bearing employee.
- **Marie** — Executive Operations Assistant; triages, routes, follows up, escalates, and briefs Simon.

## Employee capability map

| Agent | Accountable role | Primary hidden capabilities |
|---|---|---|
| Marie | Executive operations | triage, route, delegate, follow-up, escalation, brief |
| Scout | Lead intelligence | APIs, Firecrawl, controlled browser fallback |
| Claire | Research & enrichment | HyperResearch-style evidence research and provenance |
| Atlas | Qualification | scoring, fit analysis, next-best-action |
| Sofia | Digital presence & SEO | SEO, Google presence, site discoverability, analytics support |
| Maven | Legacy campaign support | existing campaign/copy procedures retained while Mark becomes accountable marketing owner |
| Mark | Marketing Director | campaign strategy, blog, KMCE Marketing Show, editorial calendar, offers, messaging |
| Cammy | Campaign Generation & Economics | campaign packages, audience scoring, cost estimates, break-even analysis, controlled variants |
| Lucy | Social Distribution & Publishing | channel adaptation, social calendar, comment triage, reply drafts, publishing workflow, performance collection |
| Tube | Video / YouTube Creator | video strategy, scripts, production packages, Shorts/repurposing, YouTube workflow |
| Helios | Visual generation engine | text-to-video, image-to-video, video-to-video motion generation under Tube/Eve direction |
| Gatekeeper | Policy & compliance | claims checks, approval gates, verification |
| Echo | Outreach | approved outreach and follow-up lifecycle |
| Booker | Scheduling | discovery and calendar coordination |
| Flow | Onboarding | documents, missing items, questions, completion tracking |
| Ledger | Finance | Stripe handoff, transaction state, double-entry ledger, reconciliation |
| Delivery/CE | Fulfillment | entitlement, attendance/completion, CE/certificate evidence |
| Eyes | Market intelligence | external trends, search demand, visual/product opportunity signals |
| Eve | Brand & catalog curator | Printify catalog scanning, internal favorites/shortlist, brand direction, collection architecture |
| Alice | Kingdom Mindset Store manager | storefront freshness, catalog health, images, copy, SEO, collections, merchandising, review queue |
| Devon | Digital product agent | downloadable products, toolkits, templates, product packaging |
| Mercedes | Merchandise designer | apparel/merch concepts, creative direction, mockup requirements |
| Snake | Store growth operations | Store Pulse, marketing cadence, outreach planning, conversion recovery |

## Stable capability contracts

| Capability | Owner | Provider candidate | Authority |
|---|---|---|---|
| knowledge.search | Simon | Obsidian read-only adapter | AUTO |
| relationship.search | Simon | Graphify | AUTO |
| llm.generate | Simon | OmniRoute → approved models | AUTO |
| procedure.lookup | Simon/Gatekeeper | ECC curated skills | AUTO |
| task.triage | Marie | Marie policy engine | AUTO |
| task.delegate | Marie | Simon agent_tasks / Hermes later | CONTROLLED |
| task.follow_up | Marie | Neon task state / scheduler later | CONTROLLED |
| executive.brief | Marie | Neon + Simon state | AUTO |
| business.search | Scout | approved APIs | AUTO |
| web.search | Scout | Firecrawl/search provider | AUTO |
| website.inspect | Scout | Firecrawl | AUTO |
| browser.inspect | Scout | controlled Playwright MCP | AUTO |
| research.deep | Claire | HyperResearch-derived pipeline | AUTO |
| lead.enrich | Claire | research providers + provenance | CONTROLLED |
| lead.qualify | Atlas | deterministic scoring + evidence | CONTROLLED |
| campaign.plan | Mark | NERVS + KMCE marketing skills | AUTO |
| marketing.campaign.prepare | Mark | NERVS campaign workflow | CONTROLLED |
| campaign.generate | Cammy | KMCE campaign generation engine | CONTROLLED |
| campaign.cost.estimate | Cammy | KMCE campaign economics model | CONTROLLED |
| campaign.target.score | Cammy | KMCE audience scoring model | CONTROLLED |
| campaign.variant.generate | Cammy | KMCE campaign experiment engine | CONTROLLED |
| campaign.email.prepare | Mark | Listmonk-compatible adapter | CONTROLLED |
| blog.prepare | Mark | KMCE marketing skills | CONTROLLED |
| marketing.show.plan | Mark | KMCE editorial workflow | CONTROLLED |
| social.plan | Mark | KMCE marketing skills | AUTO |
| social.content.adapt | Lucy | NERVS social adapter layer | CONTROLLED |
| social.calendar.prepare | Lucy | NERVS scheduler | CONTROLLED |
| social.comment.triage | Lucy | approved social connectors | CONTROLLED |
| social.reply.draft | Lucy | NERVS social adapter layer | CONTROLLED |
| social.reply.send | Lucy | approved social connectors | APPROVAL |
| social.performance.collect | Lucy | approved social analytics connectors | CONTROLLED |
| social.publish | Lucy | approved platform connectors | APPROVAL |
| video.plan | Tube | AgentTube-derived workflow | CONTROLLED |
| video.package.prepare | Tube | Tube production workflow | CONTROLLED |
| video.generate | Tube | Helios + approved video providers | CONTROLLED |
| video.publish | Tube | approved video connectors | APPROVAL |
| seo.audit | Sofia | ECC SEO + approved data providers | AUTO |
| outreach.draft | Echo/Maven | internal draft engine | AUTO |
| outreach.reply.sync | Echo | Gmail thread read + Neon CRM routing | CONTROLLED |
| outreach.send | Echo | controlled Gmail/provider connector | APPROVAL |
| calendar.find_slots | Booker/Marie | calendar connector | AUTO |
| calendar.book | Booker/Marie | calendar connector | POLICY |
| onboarding.checklist | Flow | KMCE service catalog | CONTROLLED |
| document.request | Flow | approved communications connector | APPROVAL |
| payment.request | Ledger | Stripe | APPROVAL |
| payment.reconcile | Ledger | Stripe + pgledger-derived accounting | CONTROLLED |
| entitlement.release | Ledger/Delivery | KMCE fulfillment engine | POLICY |
| ce.issue | Delivery/CE | KMCE CE engine | POLICY |
| refund.execute | Ledger | Stripe | APPROVAL |
| audit.append | Gatekeeper | Neon append-only audit | CONTROLLED |
| store.trend.research | Eyes/Snake | public trend/search intelligence providers | AUTO |
| store.pulse.review | Snake | Shopify telemetry + Neon pulse reports | CONTROLLED |
| store.catalog.review | Alice | Shopify + KMCE store operations | CONTROLLED |
| store.catalog.scan | Eve | Printify catalog | CONTROLLED |
| store.catalog.shortlist | Eve | Neon catalog favorites | CONTROLLED |
| store.brand.develop | Eve | Eve shortlist + Eyes/Snake intelligence | CONTROLLED |
| store.maintenance.audit | Alice | Shopify storefront + catalog telemetry | CONTROLLED |
| store.content.optimize | Alice | product copy, imagery, SEO, merchandising workflow | CONTROLLED |
| store.live.edit | Alice | Shopify | APPROVAL |
| store.product.digital.prepare | Devon | KMCE product workflow | CONTROLLED |
| store.product.merch.prepare | Mercedes | KMCE merchandise workflow | CONTROLLED |
| store.merch.printify.create | Mercedes | Printify API | CONTROLLED |
| store.merch.printify.publish | Mercedes | Printify connected sales channel | POLICY |
| store.campaign.prepare | Snake | store growth engine | CONTROLLED |
| store.publish | Alice | Shopify | APPROVAL |
| store.email.send | Snake | approved email provider | APPROVAL |

## Provider boundaries

- **Obsidian** is durable human-readable institutional knowledge.
- **Graphify** is relationship intelligence, never canonical truth.
- **Neon** is live operational state.
- **Hermes** is an orchestration/runtime candidate, not an authority grant.
- **ECC** supplies procedures and verification, not unrestricted execution.
- **OmniRoute** routes model inference; it has no CRM, payment, sending, or approval authority.
- **Firecrawl / Playwright** retrieve public-web evidence; APIs are preferred when available.
- **Listmonk** may execute approved email campaigns; Maven remains responsible for campaign strategy.
- **pgledger/MnemoPay-derived patterns** support Ledger; Stripe remains the payment rail unless explicitly changed.

## Marie v1 contract

Marie exists to reduce Simon's operational context load.

Every work item is classified into exactly one outcome:

1. IGNORE — noise / duplicate with no state effect.
2. LOG — worth retaining but no action required.
3. DELEGATE — route to the accountable specialist.
4. HANDLE — reversible internal coordination Marie can complete.
5. ASK_SIMON — ambiguous priority or cross-department decision.
6. ESCALATE_KIMBERLY — financial, contractual, security, authority, or material policy exception.

Marie never:
- sends external messages;
- spends/refunds money;
- changes account/security settings;
- approves her own exceptions;
- grants permissions;
- edits immutable audit/accounting history.

## Operating loop

EVENT → MARIE TRIAGE → CAPABILITY RESOLUTION → SPECIALIST → RESULT/EVIDENCE → MARIE FOLLOW-UP → SIMON BRIEF → KIMBERLY ONLY WHEN REQUIRED.

This registry is the contract. Providers can change without changing the employee model.


## Kingdom Mindset Store operating loop

EYES → SNAKE → DEVON/MERCEDES → ALICE → FOUNDER GATE → SNAKE DISTRIBUTION → EYES MEASUREMENT → SNAKE STORE PULSE.

Snake is cross-functional for store growth health. He may create internal tasks and pulse reports, but he may not publish products, send campaigns, spend ad budget, create discounts, or change live pricing without the relevant approval/policy gate.


## Alice storefront stewardship

Alice owns continuous storefront maintenance. Simon seeds a daily freshness audit and a Monday deep-clean audit. Alice checks product imagery, titles/descriptions, SEO metadata, collections, listing status, accessibility/alt text, duplicates/stale inventory presentation, visual consistency, and merchandising opportunities. Internal audits and optimization drafts are CONTROLLED; live publishing, destructive changes, live price changes, and theme/settings changes remain Founder-approval gated.


## Eve brand and catalog curation

Eve owns product discovery and brand coherence for The Kingdom Mindset Store. Simon seeds a daily Printify catalog scan and a Monday brand-development pass. Eve scans available Printify blueprints, scores candidates against store-fit rules, and maintains KMCE's own persistent shortlist in Neon. Printify's public API does not expose the website Favorites control, so Eve's shortlist is the canonical machine-readable favorite set. Eve then uses that shortlist together with Eyes/Snake market intelligence to prepare brand positioning, visual direction, collection architecture, product-family strategy, naming rules, and merchandising standards. She does not change the live store name or publish products without the appropriate approval/policy gate.


## Mercedes Printify workflow

EYES/SNAKE opportunity brief → MERCEDES artwork/product spec → PRINTIFY draft creation → ALICE storefront/merchandising review → policy-approved PRINTIFY publish → connected Shopify sales channel.

The Printify token and shop ID are server-only environment variables. Mercedes may create product drafts when a complete blueprint/provider/variant/print-area spec exists. Publishing requires the store.merch.printify.publish policy gate plus alice_approved=true. The agent never embeds credentials in code or job payloads.


## NERVS marketing/content operating loop

EYES signal → MARK campaign brief → CAMMY campaign generation/economics → EVE visual/brand rules → TUBE/MERCEDES/DEVON asset production → LUCY channel adaptation/calendar → ALICE/GATEKEEPER validation where applicable → FOUNDER/POLICY GATE → LUCY/TUBE approved publish → SNAKE measurement → EYES/MARK learning loop.

Lucy is the social distribution operator. She may adapt approved content, prepare calendars, triage comments, draft replies, and collect performance evidence as internal reversible work. Public posting and sending replies remain approval-gated until a later deterministic policy explicitly authorizes specific low-risk channels/content classes.

Helios is a visual-generation engine, not an independent business decision-maker. Tube owns the video deliverable; Eve owns brand direction; factual/clinical claims must retain evidence and review gates.


## Cammy campaign-generation contract

Cammy turns Mark's strategic brief into an executable internal campaign package and adds the economics Mark needs before approving the plan. Her v1 implementation is built from KMCE-owned rules and data rather than copied external repository code.

Cammy may generate campaign concepts and structured campaign packages; score audience segments using non-sensitive business and behavioral evidence; estimate production, distribution, acquisition, break-even, contribution, and downside economics; and create controlled test variants with hypotheses and stopping rules.

Cammy may not authorize advertising spend, publish or send externally, change live pricing or discounts, target or exclude people using protected or sensitive traits, or present modeled assumptions as guaranteed outcomes.

MARK owns strategy and campaign accountability. CAMMY owns campaign construction and economics. LUCY owns social distribution. SNAKE owns performance measurement and growth operations.
