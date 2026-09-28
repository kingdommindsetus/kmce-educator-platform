# Knowledge + Provider Layer v1

## Cloud knowledge

Canonical company knowledge can be synchronized into Neon through `POST /api/knowledge/sync`.

Each document stores:
- source type/path;
- title/content;
- SHA-256 checksum;
- canonical flag;
- source update timestamp;
- metadata.

`GET /api/knowledge/search?q=...` uses PostgreSQL full-text search.

This allows the cloud Founder Command Center to work from synchronized Obsidian knowledge without giving Vercel direct filesystem access to the local vault.

## Relationship intelligence

`knowledge_edges` stores subject / predicate / object relationships separately from canonical documents.

Each edge includes:
- confidence 0–100;
- EXTRACTED / INFERRED / AMBIGUOUS status;
- optional source document;
- provider metadata.

Graphify output may be ingested through `POST /api/providers/graphify/ingest`. Inferred or ambiguous relationships never override canonical documents.

## Provider registry

The registry exposes configuration state, not secret values.

Current stable provider contracts:
- knowledge.search → Neon Knowledge
- knowledge.sync → Obsidian Bridge
- relationship.search → Neon Knowledge Edges
- relationship.enrich → Graphify
- web.search / website.inspect → Firecrawl
- llm.generate → OmniRoute
- procedure.lookup → ECC

External providers remain disabled until their required environment configuration exists.

## Firecrawl

Scout uses Firecrawl v2 Search through `POST /api/scout/web-search` when `FIRECRAWL_API_KEY` is configured.

Requests and result counts are audited in `provider_calls`. Secret values are never stored there.

## OmniRoute

`POST /api/providers/llm` speaks an OpenAI-compatible `/v1/chat/completions` contract to the configured OmniRoute base URL.

Required configuration:
- `OMNIROUTE_BASE_URL`
- `OMNIROUTE_API_KEY`
- optional `OMNIROUTE_MODEL`

No provider gets CRM/payment/send authority by being connected.
