# Atlas v1 — Evidence-backed Qualification

Atlas converts Claire's verified lead record into a deterministic commercial routing decision.

## Inputs

Atlas reads only persisted KMCE state:

- Claire research confidence;
- verified contact status;
- verified decision maker;
- official website / official-source evidence;
- number of evidence sources.

Atlas does not invent missing facts and does not browse, send, publish, or contact anyone.

## Score

Maximum 100:

- research confidence: up to 40;
- verified contact: 20;
- decision maker: 15;
- official presence: 10;
- multi-source evidence: up to 15.

## Decisions

### QUALIFY
Requires score >= 75, research confidence >= 60, and verified contact.

Route: **Maven**  
Next action: prepare campaign/outreach strategy using verified facts only.

### HOLD
Evidence is promising but incomplete.

Route: **Claire**  
Next action: strengthen evidence before outreach planning.

### REJECT
Very weak or unsupported record.

Route: **Atlas / inactive sales motion**  
Next action: archive from active sales work unless new evidence appears.

Every run is persisted to `lead_qualification_runs` with score breakdown, reasons, decision, and next action.
