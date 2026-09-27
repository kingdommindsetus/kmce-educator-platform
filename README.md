# Kingdom Mindset CE — Educator Platform

KMCE's single operating system for dental continuing education and educator commercialization.

## Product boundaries

This repository owns:
- educator onboarding, credentials, documents, and profiles
- course intake, CE/compliance review, approval, and publication
- educator-owned lead and campaign pipelines
- outreach approval, activity history, appointments, conversions, and revenue attribution
- auditable AI agent execution

## Operating rule

**Finish → Prove → Systemize → Scale**

The first proof case is Dr. Timothy Adams, DDS, D.ASBA, D.ACSDD and the Phoenix Pilot 10.

## Safety and data rules

- Never invent credentials, contact data, dates, tuition, CE hours, or outcomes.
- Preserve provenance for researched lead/contact facts.
- No outbound communication without the required approval state.
- Educators may access only their own commercial and education records.
- Founder/admin has cross-educator operational visibility.
- AI actions must be attributable and auditable.
- Production dashboards use real data only; no fake metrics.

## Architecture

Initial backend: FastAPI + SQLite for the proof phase, designed for migration to PostgreSQL.
Frontend: Next.js + TypeScript + Tailwind.

