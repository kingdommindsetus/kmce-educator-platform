# KMCE OpenJarvis Bridge

OpenJarvis is used as an optional execution/runtime layer behind Simon and the NERVS agent offices. It does not replace the Next.js command center, Neon memory, authority gates, or ElevenLabs voices.

## Why this integration is lightweight

OpenJarvis exposes an OpenAI-compatible chat endpoint:

- POST /v1/chat/completions
- GET /v1/models
- GET /health

KMCE already uses an OpenAI-compatible LLM adapter, so the bridge only needs provider configuration.

## Provider priority

1. OpenJarvis
2. OmniRoute
3. OpenAI

## Required environment variables

For OpenJarvis:

- OPENJARVIS_BASE_URL
- OPENJARVIS_MODEL

Optional when OpenJarvis authentication is enabled:

- OPENJARVIS_API_KEY

Examples:

OPENJARVIS_BASE_URL=https://jarvis.example.com
OPENJARVIS_MODEL=qwen3:8b

The adapter automatically appends /v1 when the configured URL does not already end in /v1.

## Recommended KMCE topology

Browser / KMCE Command Center
→ Next.js API routes
→ Neon conversation + memory
→ OpenJarvis inference/agent runtime
→ KMCE authority-gated tools
→ ElevenLabs voice output

Keep OpenJarvis outside Vercel as a persistent Python service. For a local machine, Vercel cannot call localhost directly; expose the OpenJarvis server through a secure reachable endpoint or host it on a private server/VPS.

## Phase 1

Use OpenJarvis only for llm.generate while preserving KMCE memory and permissions.

## Phase 2

Connect selected KMCE tools to OpenJarvis through MCP. Do not enable unrestricted shell/file access in production. Whitelist only the exact tools each agent role needs.

## Phase 3

Evaluate OpenJarvis persistent/continuous agents for scheduled internal work after Simon and Snake pass the realtime conversation gate.
