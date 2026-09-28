import { neon } from "@neondatabase/serverless";

export function sql(){
  const url=process.env.DATABASE_URL;
  if(!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

let initialized=false;
export async function ensureSchema(){
  if(initialized) return;
  const q=sql();

  await q`CREATE TABLE IF NOT EXISTS educators (
    id BIGSERIAL PRIMARY KEY,
    public_name TEXT NOT NULL UNIQUE,
    credentials TEXT,
    professional_title TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

  await q`CREATE TABLE IF NOT EXISTS leads (
    id BIGSERIAL PRIMARY KEY,
    educator_id BIGINT NOT NULL REFERENCES educators(id),
    practice_name TEXT NOT NULL,
    decision_maker TEXT,
    city TEXT,
    state TEXT,
    email TEXT,
    phone TEXT,
    evidence TEXT,
    qualification_reason TEXT,
    qualification_score INTEGER NOT NULL DEFAULT 0,
    pipeline_stage TEXT NOT NULL DEFAULT 'QUALIFIED',
    assigned_agent TEXT,
    approval_status TEXT NOT NULL DEFAULT 'PENDING',
    contact_source_url TEXT,
    contact_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(educator_id, practice_name)
  )`;

  await q`ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_source_url TEXT`;
  await q`ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_verified_at TIMESTAMPTZ`;

  await q`CREATE TABLE IF NOT EXISTS outreach_jobs (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL REFERENCES leads(id),
    channel TEXT NOT NULL DEFAULT 'email',
    status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    draft_content TEXT NOT NULL,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    rejected_reason TEXT,
    send_token TEXT,
    provider TEXT,
    provider_message_id TEXT,
    provider_thread_id TEXT,
    sent_at TIMESTAMPTZ,
    sent_by TEXT,
    delivery_status TEXT,
    follow_up_due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

  await q`ALTER TABLE outreach_jobs ADD COLUMN IF NOT EXISTS send_token TEXT`;
  await q`ALTER TABLE outreach_jobs ADD COLUMN IF NOT EXISTS provider TEXT`;
  await q`ALTER TABLE outreach_jobs ADD COLUMN IF NOT EXISTS provider_message_id TEXT`;
  await q`ALTER TABLE outreach_jobs ADD COLUMN IF NOT EXISTS provider_thread_id TEXT`;
  await q`ALTER TABLE outreach_jobs ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ`;
  await q`ALTER TABLE outreach_jobs ADD COLUMN IF NOT EXISTS sent_by TEXT`;
  await q`ALTER TABLE outreach_jobs ADD COLUMN IF NOT EXISTS delivery_status TEXT`;
  await q`ALTER TABLE outreach_jobs ADD COLUMN IF NOT EXISTS follow_up_due_at TIMESTAMPTZ`;
  await q`CREATE UNIQUE INDEX IF NOT EXISTS outreach_jobs_send_token_uidx ON outreach_jobs(send_token) WHERE send_token IS NOT NULL`;
  await q`CREATE UNIQUE INDEX IF NOT EXISTS outreach_jobs_provider_message_uidx ON outreach_jobs(provider,provider_message_id) WHERE provider_message_id IS NOT NULL`;

  await q`CREATE TABLE IF NOT EXISTS lead_activities (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL REFERENCES leads(id),
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

  await q`CREATE TABLE IF NOT EXISTS app_users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('FOUNDER_ADMIN','EDUCATOR','STUDENT')),
    educator_id BIGINT REFERENCES educators(id),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

  await q`CREATE TABLE IF NOT EXISTS commerce_transactions (
    id BIGSERIAL PRIMARY KEY,
    provider TEXT NOT NULL DEFAULT 'stripe',
    provider_transaction_id TEXT NOT NULL,
    provider_customer_id TEXT,
    status TEXT NOT NULL,
    amount_minor BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    product_type TEXT NOT NULL DEFAULT 'UNCLASSIFIED',
    product_name TEXT,
    educator_name TEXT,
    course_name TEXT,
    event_name TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    customer_email TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(provider,provider_transaction_id)
  )`;

  await q`CREATE INDEX IF NOT EXISTS commerce_transactions_occurred_idx ON commerce_transactions(occurred_at DESC)`;
  await q`CREATE INDEX IF NOT EXISTS commerce_transactions_product_idx ON commerce_transactions(product_type,product_name)`;
  await q`CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    livemode BOOLEAN NOT NULL DEFAULT true,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    payload JSONB NOT NULL
  )`;

  await q`CREATE TABLE IF NOT EXISTS executive_briefs (
    id BIGSERIAL PRIMARY KEY,
    brief_date DATE NOT NULL UNIQUE,
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    metrics JSONB NOT NULL,
    written_brief TEXT NOT NULL,
    voice_script TEXT NOT NULL,
    audio_status TEXT NOT NULL DEFAULT 'SCRIPT_READY',
    audio_url TEXT,
    audio_generated_at TIMESTAMPTZ,
    source_snapshot JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'FROZEN',
    created_by TEXT NOT NULL DEFAULT 'Simon',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

  await q`ALTER TABLE executive_briefs ADD COLUMN IF NOT EXISTS audio_status TEXT NOT NULL DEFAULT 'SCRIPT_READY'`;
  await q`ALTER TABLE executive_briefs ADD COLUMN IF NOT EXISTS audio_url TEXT`;
  await q`ALTER TABLE executive_briefs ADD COLUMN IF NOT EXISTS audio_generated_at TIMESTAMPTZ`;

  initialized=true;
}
