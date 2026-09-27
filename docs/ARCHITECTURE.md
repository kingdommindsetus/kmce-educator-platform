# KMCE V1 Architecture

## Source of truth
The Educator Platform is the system of record. Agent Farm and Campaign Builder are capabilities, not competing CRMs.

## Ownership
Organization -> Educator -> Course / Campaign / Lead.

Every commercial record is educator-scoped. Founder/admin may operate across educators; educator users are restricted to their own records.

## Lead state machine
DISCOVERED -> ENRICHING -> QUALIFIED -> OUTREACH_READY -> PENDING_APPROVAL -> APPROVED -> CONTACTED -> FOLLOW_UP -> REPLIED -> INTERESTED -> CALL_BOOKED -> OPPORTUNITY -> CONVERTED.

Terminal/exception states: CLOSED, NOT_A_FIT, DO_NOT_CONTACT, BOUNCED.

## Auditability
Lead facts preserve provenance. Agent work is recorded in agent_runs. Human/agent/system changes to a lead are recorded in lead_activities.

## Approval boundary
Drafting and research may be automated. Outbound communication is not sent merely because a draft exists. outreach_jobs begin in PENDING_APPROVAL and must record approval before send-capable integrations are introduced.

## First proof
Dr. Timothy Adams, DDS, D.ASBA, D.ACSDD -> Phoenix campaign -> Pilot 10 -> approval -> outreach -> reply -> booking -> conversion -> revenue attribution.
