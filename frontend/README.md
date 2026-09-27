# KMCE Founder Command Center

Next.js founder operations UI for the KMCE Educator Platform.

## Run locally
1. Copy .env.example to .env.local.
2. Set NEXT_PUBLIC_API_URL to the FastAPI backend.
3. npm install
4. npm run dev

## Current boundary
This interface can inspect educator workspaces, lead evidence/activity, edit pending Maven drafts, and approve/reject Gatekeeper items.

Approval does not send communication. A separate send-capable integration must be deliberately introduced later with authorization, delivery logging, and compliance controls.
