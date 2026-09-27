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
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(educator_id, practice_name)
  )`;
  await q`CREATE TABLE IF NOT EXISTS outreach_jobs (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL REFERENCES leads(id),
    channel TEXT NOT NULL DEFAULT 'email',
    status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    draft_content TEXT NOT NULL,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    rejected_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await q`CREATE TABLE IF NOT EXISTS lead_activities (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL REFERENCES leads(id),
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await q`CREATE TABLE IF NOT EXISTS app_users (\n    id BIGSERIAL PRIMARY KEY,\n    email TEXT NOT NULL UNIQUE,\n    display_name TEXT,\n    role TEXT NOT NULL CHECK (role IN ('FOUNDER_ADMIN','EDUCATOR','STUDENT')),\n    educator_id BIGINT REFERENCES educators(id),\n    last_login_at TIMESTAMPTZ,\n    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),\n    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()\n  )`;\n  initialized=true;
}
