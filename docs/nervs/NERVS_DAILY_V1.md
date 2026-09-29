# NERVS DAILY v1

## Purpose

NERVS DAILY is KMCE's spoken 8:00 AM operating meeting. It converts live company state into concise spoken status reports, blockers, cross-agent decisions, auditable follow-up actions, and a founder-readable executive summary.

## Standard report contract

Every speaking agent reports four fields:
- WIN — completed work or verified positive result.
- BLOCKER — the most important failure, dependency, or risk.
- NEXT — the highest-value action for the current day.
- ASK — a specific request to another agent or the Founder when needed.

Reports must reference live evidence from tasks, jobs, sales, campaigns, store operations, finance, or approved connected systems.

## Meeting order

1. Simon — executive opening, revenue movement, approvals, company priorities.
2. Operations — Marie, Flow, Ledger, Delivery/CE.
3. Sales — Scout, Claire, Atlas, Echo, Booker.
4. Marketing — Eyes, Mark, Cammy, Eve, Tube, Lucy, Snake.
5. Store and Product — Eve, Mercedes, Devon, Alice, Snake.
6. Gatekeeper — compliance, claims, unresolved approvals.
7. Simon — decision recap, owner/action/deadline summary, close.

## Voice architecture

Each speaker receives one persistent voice profile. ElevenLabs is the initial provider.

The existing Simon ElevenLabs route is the reference implementation. NERVS should generalize that provider pattern to per-agent voice IDs and per-agent voice settings while keeping API keys server-side.

## Meeting lifecycle

PREPARING -> READY -> RUNNING -> COMPLETED

During PREPARING, NERVS snapshots:
- autonomy jobs and failures,
- agent tasks,
- lead and sales pipeline movement,
- campaigns and growth state,
- store pulse and product work,
- payments and revenue evidence,
- approvals waiting on Kimberly.

## Action extraction

Spoken statements do not create external effects by themselves.

Meeting decisions can generate internal action records. Any later conversion to agent tasks or autonomy jobs must preserve the existing AUTO, CONTROLLED, POLICY, APPROVAL, and FORBIDDEN authority boundaries.

## Anti-chaos rules

- One active speaker at a time.
- Maximum one primary blocker per agent.
- No recursive agent-to-agent conversation without NERVS routing.
- No external publish, send, or spend from spoken statements alone.
- Every cross-agent ask names one accountable owner.
- Duplicate asks collapse into one action.
- Simon closes with the top three company priorities.

## First proof

Before audio:
1. generate one synthetic meeting from live state,
2. verify WIN/BLOCKER/NEXT/ASK fields,
3. extract action items,
4. confirm no unauthorized external effect.

After voice profiles are loaded:
5. render individual audio segments,
6. play them in deterministic speaking order,
7. preserve transcript and action evidence.
