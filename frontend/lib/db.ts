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
  await q`ALTER TABLE leads ADD COLUMN IF NOT EXISTS website TEXT`;
  await q`ALTER TABLE leads ADD COLUMN IF NOT EXISTS website_host TEXT`;
  await q`ALTER TABLE leads ADD COLUMN IF NOT EXISTS discovery_source TEXT`;
  await q`ALTER TABLE leads ADD COLUMN IF NOT EXISTS research_confidence INTEGER NOT NULL DEFAULT 0`;
  await q`ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_researched_at TIMESTAMPTZ`;
  await q`CREATE INDEX IF NOT EXISTS leads_website_host_idx ON leads(website_host) WHERE website_host IS NOT NULL`;

  await q`CREATE TABLE IF NOT EXISTS lead_evidence (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    source_url TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'PUBLIC_WEB',
    field_name TEXT NOT NULL,
    observed_value TEXT,
    confidence INTEGER NOT NULL DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
    discovered_by TEXT NOT NULL,
    verified_by TEXT,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await q`CREATE INDEX IF NOT EXISTS lead_evidence_lead_idx ON lead_evidence(lead_id,created_at DESC)`;
  await q`CREATE INDEX IF NOT EXISTS lead_evidence_source_idx ON lead_evidence(source_url)`;

  await q`CREATE TABLE IF NOT EXISTS lead_qualification_runs (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
    decision TEXT NOT NULL CHECK (decision IN ('QUALIFY','HOLD','REJECT')),
    score_breakdown JSONB NOT NULL,
    reasons JSONB NOT NULL,
    next_action TEXT NOT NULL,
    qualified_by TEXT NOT NULL DEFAULT 'Atlas',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await q`CREATE INDEX IF NOT EXISTS lead_qualification_runs_lead_idx ON lead_qualification_runs(lead_id,created_at DESC)`;

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
  await q`ALTER TABLE outreach_jobs ADD COLUMN IF NOT EXISTS draft_sha256 TEXT`;
  await q`ALTER TABLE outreach_jobs ADD COLUMN IF NOT EXISTS draft_version INTEGER NOT NULL DEFAULT 1`;
  await q`ALTER TABLE outreach_jobs ADD COLUMN IF NOT EXISTS approved_sha256 TEXT`;
  await q`ALTER TABLE outreach_jobs ADD COLUMN IF NOT EXISTS send_attempt_id TEXT`;
  await q`ALTER TABLE outreach_jobs ADD COLUMN IF NOT EXISTS send_attempted_at TIMESTAMPTZ`;
  await q`ALTER TABLE outreach_jobs ADD COLUMN IF NOT EXISTS send_error TEXT`;
  await q`CREATE UNIQUE INDEX IF NOT EXISTS outreach_jobs_send_token_uidx ON outreach_jobs(send_token) WHERE send_token IS NOT NULL`;
  await q`CREATE UNIQUE INDEX IF NOT EXISTS outreach_jobs_send_attempt_uidx ON outreach_jobs(send_attempt_id) WHERE send_attempt_id IS NOT NULL`;
  await q`CREATE UNIQUE INDEX IF NOT EXISTS outreach_jobs_provider_message_uidx ON outreach_jobs(provider,provider_message_id) WHERE provider_message_id IS NOT NULL`;

  await q`CREATE TABLE IF NOT EXISTS inbound_replies (
    id BIGSERIAL PRIMARY KEY,
    outreach_job_id BIGINT NOT NULL REFERENCES outreach_jobs(id) ON DELETE CASCADE,
    lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'gmail',
    provider_message_id TEXT NOT NULL,
    provider_thread_id TEXT NOT NULL,
    sender TEXT,
    recipient TEXT,
    subject TEXT,
    body TEXT,
    message_at TIMESTAMPTZ,
    classification TEXT NOT NULL DEFAULT 'REPLIED' CHECK (classification IN ('REPLIED','INTERESTED','NOT_INTERESTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(provider,provider_message_id)
  )`;
  await q`CREATE INDEX IF NOT EXISTS inbound_replies_lead_idx ON inbound_replies(lead_id,message_at DESC,id DESC)`;
  await q`CREATE INDEX IF NOT EXISTS inbound_replies_outreach_idx ON inbound_replies(outreach_job_id,message_at DESC,id DESC)`;

  await q`CREATE TABLE IF NOT EXISTS discovery_appointments (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('PROPOSED','BOOKED','COMPLETED','CANCELLED','NO_SHOW')),
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    booking_source TEXT NOT NULL DEFAULT 'FOUNDER',
    outcome TEXT,
    notes TEXT,
    created_by TEXT NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await q`CREATE INDEX IF NOT EXISTS discovery_appointments_lead_idx ON discovery_appointments(lead_id,created_at DESC)`;

  await q`CREATE TABLE IF NOT EXISTS onboarding_cases (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    service_code TEXT NOT NULL DEFAULT 'UNASSIGNED',
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','READY_FOR_PAYMENT','BLOCKED','COMPLETED','CANCELLED')),
    required_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    completed_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    opened_by TEXT NOT NULL DEFAULT 'Flow',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await q`CREATE UNIQUE INDEX IF NOT EXISTS onboarding_cases_active_lead_uidx ON onboarding_cases(lead_id) WHERE status NOT IN ('COMPLETED','CANCELLED')`;

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

  await q`CREATE TABLE IF NOT EXISTS simon_sessions (id BIGSERIAL PRIMARY KEY, founder_email TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await q`CREATE TABLE IF NOT EXISTS simon_messages (id BIGSERIAL PRIMARY KEY, session_id BIGINT NOT NULL REFERENCES simon_sessions(id), role TEXT NOT NULL CHECK (role IN ('FOUNDER','SIMON')), content TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await q`CREATE TABLE IF NOT EXISTS agent_tasks (id BIGSERIAL PRIMARY KEY, assigned_agent TEXT NOT NULL, title TEXT NOT NULL, instruction TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'QUEUED', source TEXT NOT NULL DEFAULT 'SIMON', requested_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await q`CREATE TABLE IF NOT EXISTS simon_actions (id BIGSERIAL PRIMARY KEY, session_id BIGINT REFERENCES simon_sessions(id), action_type TEXT NOT NULL, target TEXT, payload JSONB NOT NULL DEFAULT '{}'::jsonb, status TEXT NOT NULL, requested_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await q`CREATE INDEX IF NOT EXISTS simon_messages_session_idx ON simon_messages(session_id,created_at)`;
  await q`CREATE INDEX IF NOT EXISTS agent_tasks_agent_idx ON agent_tasks(assigned_agent,status,created_at DESC)`;


  await q`CREATE TABLE IF NOT EXISTS agent_conversation_sessions (
    id BIGSERIAL PRIMARY KEY,
    agent_name TEXT NOT NULL,
    founder_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','CLOSED')),
    title TEXT,
    summary TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await q`CREATE INDEX IF NOT EXISTS agent_conversation_sessions_agent_idx ON agent_conversation_sessions(agent_name,status,updated_at DESC)`;

  await q`CREATE TABLE IF NOT EXISTS agent_conversation_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES agent_conversation_sessions(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('FOUNDER','AGENT','SYSTEM')),
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await q`CREATE INDEX IF NOT EXISTS agent_conversation_messages_session_idx ON agent_conversation_messages(session_id,id)`;
  await q`CREATE INDEX IF NOT EXISTS agent_conversation_messages_agent_idx ON agent_conversation_messages(agent_name,created_at DESC)`;

  await q`CREATE TABLE IF NOT EXISTS agent_memories (
    id BIGSERIAL PRIMARY KEY,
    agent_name TEXT NOT NULL,
    memory_type TEXT NOT NULL DEFAULT 'INTERACTION' CHECK (memory_type IN ('INTERACTION','SUMMARY','EVENT','BROADCAST')),
    content TEXT NOT NULL,
    importance INTEGER NOT NULL DEFAULT 50 CHECK (importance BETWEEN 0 AND 100),
    topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_session_id BIGINT REFERENCES agent_conversation_sessions(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await q`CREATE INDEX IF NOT EXISTS agent_memories_agent_idx ON agent_memories(agent_name,importance DESC,created_at DESC)`;
  await q`CREATE INDEX IF NOT EXISTS agent_memories_topics_idx ON agent_memories USING GIN(topics)`;

  await q`CREATE TABLE IF NOT EXISTS agent_voice_profiles (
    agent_name TEXT PRIMARY KEY,
    provider TEXT NOT NULL DEFAULT 'elevenlabs',
    provider_voice_id TEXT,
    display_name TEXT NOT NULL,
    department TEXT,
    voice_status TEXT NOT NULL DEFAULT 'MISSING' CHECK (voice_status IN ('MISSING','READY','DISABLED','ERROR')),
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;


  await q`INSERT INTO agent_voice_profiles(agent_name,display_name,department,provider,provider_voice_id,voice_status,metadata)
    VALUES
      ('Simon','Simon','Executive','elevenlabs','3WqHLnw80rOZqJzW9YRB','READY','{"voice_name":"Sir Michael Caine™","voice_resolution":"canonical_id"}'::jsonb),
      ('Marie','Marie','Operations','elevenlabs','21m00Tcm4TlvDq8ikWAM','READY','{"voice_name":"Rachel - warm executive operations","voice_resolution":"agent_registry"}'::jsonb),
      ('Eyes','Eyes','Intelligence','elevenlabs','jRAAK67SEFE9m7ci5DhD','READY','{"voice_name":"Eyes canonical ElevenLabs voice"}'::jsonb),
      ('Mark','Mark','Marketing','elevenlabs','IKne3meq5aSn9XLyUdCD','READY','{"voice_name":"Charlie - Deep, Confident, Energetic"}'::jsonb),
      ('Cammy','Cammy','Campaigns','elevenlabs','XrExE9yKIg1WjnnlVkGX','READY','{"voice_name":"Matilda - Knowledgable, Professional"}'::jsonb),
      ('Eve','Eve','Brand','elevenlabs','yj30vwTGJxSHezdAGsv9','READY','{"voice_name":"Eve canonical ElevenLabs voice"}'::jsonb),
      ('Tube','Tube','Video','elevenlabs','TX3LPaxmHKxFdv7VOQHJ','READY','{"voice_name":"Liam - Energetic, Social Media Creator"}'::jsonb),
      ('Lucy','Lucy','Social','elevenlabs','XlDdozLmuTofIxK4BjPD','READY','{"voice_name":"Lucy canonical ElevenLabs voice"}'::jsonb),
      ('Snake','Snake','Growth','elevenlabs','jHprmvvyQreWpRuutdmV','READY','{"voice_name":"Snake canonical ElevenLabs voice"}'::jsonb),
      ('Alice','Alice','Store','elevenlabs','Xb7hH8MSUJpSbSDYk0k2','READY','{"voice_name":"Alice - Clear, Engaging Educator"}'::jsonb),
      ('Echo','Echo','Sales Outreach','elevenlabs','cjVigY5qzO86Huf0OWal','READY','{"voice_name":"Eric - Smooth, Trustworthy"}'::jsonb),
      ('Booker','Booker','Sales Scheduling','elevenlabs','Cz0K1kOv9tD8l0b5Qu53','READY','{"voice_name":"Booker canonical ElevenLabs voice"}'::jsonb)
    ON CONFLICT(agent_name) DO UPDATE SET
      display_name=EXCLUDED.display_name,
      department=EXCLUDED.department,
      provider=EXCLUDED.provider,
      provider_voice_id=EXCLUDED.provider_voice_id,
      voice_status=EXCLUDED.voice_status,
      metadata=EXCLUDED.metadata,
      updated_at=now()`;

  await q`CREATE TABLE IF NOT EXISTS nervs_meeting_runs (
    id BIGSERIAL PRIMARY KEY,
    meeting_date DATE NOT NULL,
    meeting_type TEXT NOT NULL DEFAULT 'DAILY_8AM',
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    status TEXT NOT NULL DEFAULT 'PREPARING' CHECK (status IN ('PREPARING','READY','RUNNING','COMPLETED','FAILED','CANCELLED')),
    agenda JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    summary TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by TEXT NOT NULL DEFAULT 'NERVS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(meeting_date,meeting_type)
  )`;

  await q`ALTER TABLE nervs_meeting_runs ADD COLUMN IF NOT EXISTS notion_sync_status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED'`;
  await q`ALTER TABLE nervs_meeting_runs ADD COLUMN IF NOT EXISTS notion_page_id TEXT`;
  await q`ALTER TABLE nervs_meeting_runs ADD COLUMN IF NOT EXISTS notion_page_url TEXT`;
  await q`ALTER TABLE nervs_meeting_runs ADD COLUMN IF NOT EXISTS notion_synced_at TIMESTAMPTZ`;
  await q`ALTER TABLE nervs_meeting_runs ADD COLUMN IF NOT EXISTS notion_sync_error TEXT`;
  await q`CREATE TABLE IF NOT EXISTS nervs_meeting_reports (
    id BIGSERIAL PRIMARY KEY,
    meeting_id BIGINT NOT NULL REFERENCES nervs_meeting_runs(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    department TEXT,
    speaking_order INTEGER,
    win TEXT,
    blocker TEXT,
    next_action TEXT,
    ask_of_team TEXT,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    voice_script TEXT,
    audio_status TEXT NOT NULL DEFAULT 'SCRIPT_READY' CHECK (audio_status IN ('SCRIPT_READY','GENERATING','AUDIO_READY','ERROR','SKIPPED')),
    audio_url TEXT,
    provider_audio_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(meeting_id,agent_name)
  )`;

  await q`CREATE TABLE IF NOT EXISTS nervs_meeting_actions (
    id BIGSERIAL PRIMARY KEY,
    meeting_id BIGINT NOT NULL REFERENCES nervs_meeting_runs(id) ON DELETE CASCADE,
    source_agent TEXT,
    assigned_agent TEXT NOT NULL,
    title TEXT NOT NULL,
    instruction TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
    authority TEXT NOT NULL DEFAULT 'CONTROLLED' CHECK (authority IN ('AUTO','CONTROLLED','POLICY','APPROVAL','FORBIDDEN')),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','QUEUED','IN_PROGRESS','WAITING_APPROVAL','DONE','CANCELLED')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

  await q`CREATE INDEX IF NOT EXISTS nervs_meeting_reports_meeting_idx ON nervs_meeting_reports(meeting_id,speaking_order,id)`;
  await q`CREATE INDEX IF NOT EXISTS nervs_meeting_actions_meeting_idx ON nervs_meeting_actions(meeting_id,status,priority)`;

  await q`CREATE TABLE IF NOT EXISTS service_catalog (
    service_code TEXT PRIMARY KEY,
    service_name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    fulfillment_type TEXT NOT NULL,
    payment_mode TEXT NOT NULL DEFAULT 'MANUAL_OR_STRIPE',
    responsible_agent TEXT NOT NULL,
    onboarding_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
    entitlement_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

  await q`CREATE TABLE IF NOT EXISTS autonomy_jobs (
    id BIGSERIAL PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    capability TEXT NOT NULL,
    owner_agent TEXT NOT NULL,
    authority TEXT NOT NULL CHECK (authority IN ('AUTO','CONTROLLED','POLICY','APPROVAL','FORBIDDEN')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','RUNNING','WAITING_APPROVAL','SUCCEEDED','FAILED','DEAD','CANCELLED')),
    entity_type TEXT,
    entity_id TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB,
    error_text TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    run_after TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    created_by TEXT NOT NULL DEFAULT 'Simon',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await q`CREATE INDEX IF NOT EXISTS autonomy_jobs_due_idx ON autonomy_jobs(status,run_after,id)`;
  await q`CREATE INDEX IF NOT EXISTS autonomy_jobs_owner_idx ON autonomy_jobs(owner_agent,status,created_at DESC)`;

  await q`CREATE TABLE IF NOT EXISTS autonomy_events (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    source TEXT NOT NULL,
    correlation_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await q`CREATE INDEX IF NOT EXISTS autonomy_events_entity_idx ON autonomy_events(entity_type,entity_id,created_at DESC)`;

  await q`CREATE TABLE IF NOT EXISTS ledger_accounts (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

  await q`CREATE TABLE IF NOT EXISTS ledger_journals (
    id BIGSERIAL PRIMARY KEY,
    source_provider TEXT NOT NULL,
    source_transaction_id TEXT NOT NULL,
    journal_type TEXT NOT NULL,
    description TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(source_provider,source_transaction_id,journal_type)
  )`;

  await q`CREATE TABLE IF NOT EXISTS ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    journal_id BIGINT NOT NULL REFERENCES ledger_journals(id) ON DELETE CASCADE,
    account_code TEXT NOT NULL REFERENCES ledger_accounts(code),
    direction TEXT NOT NULL CHECK (direction IN ('DEBIT','CREDIT')),
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency TEXT NOT NULL DEFAULT 'usd',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await q`CREATE INDEX IF NOT EXISTS ledger_entries_journal_idx ON ledger_entries(journal_id,id)`;

  await q`CREATE TABLE IF NOT EXISTS entitlements (
    id BIGSERIAL PRIMARY KEY,
    customer_email TEXT,
    service_code TEXT NOT NULL,
    source_provider TEXT NOT NULL DEFAULT 'stripe',
    source_transaction_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','COMPLETED','REVOKED')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    granted_at TIMESTAMPTZ,
    fulfilled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(source_provider,source_transaction_id,service_code)
  )`;

  await q`CREATE TABLE IF NOT EXISTS learning_enrollments (
    id BIGSERIAL PRIMARY KEY,
    entitlement_id BIGINT REFERENCES entitlements(id) ON DELETE SET NULL,
    learner_email TEXT NOT NULL,
    course_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ENROLLED' CHECK (status IN ('ENROLLED','IN_PROGRESS','COMPLETED','CANCELLED')),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE(learner_email,course_code,entitlement_id)
  )`;

  await q`CREATE TABLE IF NOT EXISTS ce_completion_records (
    id BIGSERIAL PRIMARY KEY,
    enrollment_id BIGINT NOT NULL REFERENCES learning_enrollments(id) ON DELETE CASCADE,
    ce_hours NUMERIC(6,2) NOT NULL CHECK (ce_hours >= 0),
    attendance_verified BOOLEAN NOT NULL DEFAULT false,
    assessment_passed BOOLEAN NOT NULL DEFAULT false,
    evaluation_completed BOOLEAN NOT NULL DEFAULT false,
    eligibility_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (eligibility_status IN ('PENDING','ELIGIBLE','INELIGIBLE')),
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(enrollment_id)
  )`;

  await q`CREATE TABLE IF NOT EXISTS ce_certificates (
    id BIGSERIAL PRIMARY KEY,
    completion_id BIGINT NOT NULL UNIQUE REFERENCES ce_completion_records(id) ON DELETE CASCADE,
    certificate_number TEXT NOT NULL UNIQUE,
    issued_to_email TEXT NOT NULL,
    course_code TEXT NOT NULL,
    ce_hours NUMERIC(6,2) NOT NULL,
    issued_by TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED','REVOKED')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
  )`;

  await q`CREATE TABLE IF NOT EXISTS growth_campaigns (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    objective TEXT NOT NULL,
    audience TEXT,
    service_code TEXT,
    channels JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','PAUSED','COMPLETED','CANCELLED')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

  await q`CREATE TABLE IF NOT EXISTS content_assets (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES growth_campaigns(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    title TEXT,
    body TEXT NOT NULL,
    source_asset_id BIGINT REFERENCES content_assets(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','PUBLISHED','REJECTED')),
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    provider_reference TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await q`CREATE INDEX IF NOT EXISTS content_assets_campaign_idx ON content_assets(campaign_id,status,channel)`;

  await q`CREATE TABLE IF NOT EXISTS growth_metrics (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES growth_campaigns(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    metric_date DATE NOT NULL,
    impressions BIGINT NOT NULL DEFAULT 0,
    clicks BIGINT NOT NULL DEFAULT 0,
    leads BIGINT NOT NULL DEFAULT 0,
    conversions BIGINT NOT NULL DEFAULT 0,
    spend_minor BIGINT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(campaign_id,channel,metric_date)
  )`;

  await q`CREATE TABLE IF NOT EXISTS store_metrics_snapshots (
    id BIGSERIAL PRIMARY KEY,
    store_code TEXT NOT NULL DEFAULT 'KINGDOM_MINDSET_STORE',
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    products_active INTEGER NOT NULL DEFAULT 0,
    products_draft INTEGER NOT NULL DEFAULT 0,
    orders_count INTEGER NOT NULL DEFAULT 0,
    revenue_minor BIGINT NOT NULL DEFAULT 0,
    sessions BIGINT NOT NULL DEFAULT 0,
    conversion_rate NUMERIC(8,4),
    email_campaigns_7d INTEGER NOT NULL DEFAULT 0,
    social_posts_7d INTEGER NOT NULL DEFAULT 0,
    new_products_14d INTEGER NOT NULL DEFAULT 0,
    last_campaign_at TIMESTAMPTZ,
    last_product_publish_at TIMESTAMPTZ,
    source TEXT NOT NULL DEFAULT 'SHOPIFY',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(store_code,snapshot_date,source)
  )`;
  await q`CREATE INDEX IF NOT EXISTS store_metrics_snapshots_recent_idx ON store_metrics_snapshots(store_code,snapshot_date DESC,created_at DESC)`;

  await q`CREATE TABLE IF NOT EXISTS store_catalog_favorites (
    id BIGSERIAL PRIMARY KEY,
    store_code TEXT NOT NULL DEFAULT 'KINGDOM_MINDSET_STORE',
    provider TEXT NOT NULL DEFAULT 'PRINTIFY',
    provider_item_id TEXT NOT NULL,
    title TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    image_url TEXT,
    source TEXT NOT NULL DEFAULT 'EVE_SCAN',
    favorite_status TEXT NOT NULL DEFAULT 'SHORTLISTED' CHECK (favorite_status IN ('SHORTLISTED','SELECTED','REJECTED','ARCHIVED')),
    fit_score INTEGER NOT NULL DEFAULT 0 CHECK (fit_score BETWEEN 0 AND 100),
    rationale TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT NOT NULL DEFAULT 'Eve',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(store_code,provider,provider_item_id)
  )`;
  await q`CREATE INDEX IF NOT EXISTS store_catalog_favorites_status_idx ON store_catalog_favorites(store_code,favorite_status,fit_score DESC)`;

  await q`CREATE TABLE IF NOT EXISTS store_brand_briefs (
    id BIGSERIAL PRIMARY KEY,
    store_code TEXT NOT NULL DEFAULT 'KINGDOM_MINDSET_STORE',
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','REVIEW','APPROVED','ARCHIVED')),
    brand_name TEXT,
    positioning TEXT,
    audience TEXT,
    visual_direction JSONB NOT NULL DEFAULT '{}'::jsonb,
    collection_direction JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_favorite_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by TEXT NOT NULL DEFAULT 'Eve',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

  await q`CREATE TABLE IF NOT EXISTS store_pulse_reports (
    id BIGSERIAL PRIMARY KEY,
    store_code TEXT NOT NULL DEFAULT 'KINGDOM_MINDSET_STORE',
    cadence TEXT NOT NULL CHECK (cadence IN ('DAILY','WEEKLY')),
    pulse_status TEXT NOT NULL CHECK (pulse_status IN ('GREEN','YELLOW','RED','NO_DATA')),
    snapshot_id BIGINT REFERENCES store_metrics_snapshots(id) ON DELETE SET NULL,
    findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    actions_created JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by TEXT NOT NULL DEFAULT 'Snake',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await q`CREATE INDEX IF NOT EXISTS store_pulse_reports_recent_idx ON store_pulse_reports(store_code,cadence,created_at DESC)`;

  await q`CREATE TABLE IF NOT EXISTS knowledge_documents (
    id BIGSERIAL PRIMARY KEY,
    source_type TEXT NOT NULL,
    source_path TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    checksum TEXT NOT NULL,
    is_canonical BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_updated_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(source_type,source_path)
  )`;
  await q`CREATE INDEX IF NOT EXISTS knowledge_documents_fts_idx ON knowledge_documents USING GIN (to_tsvector('english',coalesce(title,'')||' '||content))`;

  await q`CREATE TABLE IF NOT EXISTS knowledge_edges (
    id BIGSERIAL PRIMARY KEY,
    subject TEXT NOT NULL,
    predicate TEXT NOT NULL,
    object TEXT NOT NULL,
    confidence INTEGER NOT NULL DEFAULT 100 CHECK (confidence BETWEEN 0 AND 100),
    relation_status TEXT NOT NULL DEFAULT 'EXTRACTED' CHECK (relation_status IN ('EXTRACTED','INFERRED','AMBIGUOUS')),
    evidence_document_id BIGINT REFERENCES knowledge_documents(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await q`CREATE INDEX IF NOT EXISTS knowledge_edges_subject_idx ON knowledge_edges(subject,predicate)`;

  await q`CREATE TABLE IF NOT EXISTS provider_registry (
    id BIGSERIAL PRIMARY KEY,
    capability TEXT NOT NULL,
    provider_name TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 100,
    status TEXT NOT NULL DEFAULT 'DISABLED' CHECK (status IN ('DISABLED','CONFIGURED','HEALTHY','DEGRADED','ERROR')),
    base_url TEXT,
    credential_env TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(capability,provider_name)
  )`;

  await q`CREATE TABLE IF NOT EXISTS provider_calls (
    id BIGSERIAL PRIMARY KEY,
    capability TEXT NOT NULL,
    provider_name TEXT NOT NULL,
    status TEXT NOT NULL,
    duration_ms INTEGER,
    request_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    result_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await q`CREATE INDEX IF NOT EXISTS provider_calls_recent_idx ON provider_calls(provider_name,created_at DESC)`;

  await q`CREATE TABLE IF NOT EXISTS autonomy_runs (
    id BIGSERIAL PRIMARY KEY,
    worker_name TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    claimed_count INTEGER NOT NULL DEFAULT 0,
    succeeded_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    waiting_approval_count INTEGER NOT NULL DEFAULT 0,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb
  )`;

  initialized=true;
}
