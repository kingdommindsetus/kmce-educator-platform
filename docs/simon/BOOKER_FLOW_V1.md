# Booker + Flow v1

## Booker
Booker owns discovery scheduling state. v1 does not call an external calendar provider.

- Booking allowed only for REPLIED / INTERESTED leads.
- Contact must already be verified.
- Scheduled time is required.
- Booking creates a durable `discovery_appointments` record and moves the lead to `CALL_BOOKED`.
- Completing discovery records one of three outcomes:
  - INTERESTED → OPPORTUNITY → Flow
  - FOLLOW_UP → FOLLOW_UP → Echo
  - NOT_A_FIT → DISQUALIFIED → Atlas

## Flow
Flow owns onboarding state after an interested discovery.

- Creates one active `onboarding_cases` record per lead.
- Tracks required, completed, and missing items.
- Service code can add service-specific requirements.
- When every requirement is complete the case moves to `READY_FOR_PAYMENT` and hands off to Ledger.
- No document request, email, payment, contract signature, or external action is executed automatically in v1.
