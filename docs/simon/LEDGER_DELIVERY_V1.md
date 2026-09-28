# Ledger + Delivery/CE v1

## Payment accounting

Stripe remains the payment rail.

On a successful Stripe payment intent, KMCE may record a balanced internal journal:

- Debit: Stripe Clearing
- Credit: Unearned Revenue

This records the economic event without moving funds or recognizing earned revenue prematurely.

## Entitlements

A valid Stripe `service_code` can create an idempotent paid entitlement. Optional `course_code` metadata can create a learner enrollment.

Unknown/missing service codes do not create entitlements.

## Revenue recognition

Revenue recognition is separate from payment receipt. Founder/policy-controlled `POST /api/ledger/recognize` requires an active entitlement plus explicit fulfillment evidence.

Recognition journal:

- Debit: Unearned Revenue
- Credit: Sales Revenue

The entitlement is then marked completed/fulfilled.

## CE

CE completion records require persisted evidence fields:

- CE hours
- attendance verified
- assessment passed
- evaluation completed

Only records satisfying all required checks become ELIGIBLE.

Certificate issuance is a separate Founder-controlled step. Certificates include KMCE provider metadata and use deterministic certificate numbers.

## Boundaries

v1 does not autonomously:
- issue refunds;
- move money;
- change banking destinations;
- recognize revenue without fulfillment evidence;
- issue CE without evidence/eligibility;
- edit historical ledger entries.
