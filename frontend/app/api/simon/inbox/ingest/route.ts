import { NextResponse } from "next/server";
import { ensureSchema, sql } from "../../../../../lib/db";
import { idempotencyKey } from "../../../../../lib/simon/autonomy-core";

export const runtime = "nodejs";

type InboxAttachment = {
  attachment_id?: string;
  filename?: string;
  mime_type?: string;
  size?: number;
  drive_file_id?: string;
  drive_url?: string;
  crm_record_id?: string;
};

type InboxMessage = {
  account: string;
  provider?: string;
  message_id: string;
  thread_id?: string;
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  received_at?: string;
  source?: string;
  attachments?: InboxAttachment[];
  lead_email?: string;
  metadata?: Record<string, unknown>;
};

type InboxKind = "LEAD" | "FACULTY_DOCUMENT" | "PAYMENT" | "GENERAL";

function authorized(req: Request) {
  const expected = process.env.SIMON_WEBHOOK_SECRET || "";
  const supplied =
    req.headers.get("x-simon-webhook-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  return Boolean(expected) && supplied === expected;
}

function normalizeEmail(value?: string) {
  const raw = String(value || "").trim().toLowerCase();
  const m = raw.match(/<([^>]+)>/);
  return (m ? m[1] : raw).trim();
}

function classifyInbox(body: InboxMessage): InboxKind {
  const source = String(body.source || "").toLowerCase();
  const subject = String(body.subject || "").toLowerCase();
  const text = String(body.body || "").toLowerCase();
  const attachmentNames = (body.attachments || []).map(a => String(a.filename || "").toLowerCase()).join(" ");
  if (
    source.includes("formspree") ||
    source.includes("lead") ||
    subject.includes("interest") ||
    subject.includes("inquiry") ||
    subject.includes("request") ||
    subject.includes("contact form")
  ) return "LEAD";
  if (
    attachmentNames.includes("signed") ||
    attachmentNames.includes("agreement") ||
    subject.includes("signed agreement") ||
    subject.includes("executed agreement") ||
    text.includes("signed agreement")
  ) return "FACULTY_DOCUMENT";
  if (
    subject.includes("payment") ||
    subject.includes("receipt") ||
    subject.includes("paid") ||
    text.includes("payment received")
  ) return "PAYMENT";
  return "GENERAL";
}

function inferDraft(subject: string) {
  return `Subject: Re: ${subject || "KMCE follow-up"}\n\nHello,\n\nThank you for reaching out to Kingdom Mindset CE. We received your message and are reviewing the next step. We will follow up shortly.\n\nBest,\nKingdom Mindset CE`;
}

async function ensureInboxSchema() {
  await ensureSchema();
  const q = sql();
  await q`CREATE TABLE IF NOT EXISTS simon_inbox_messages (
    id BIGSERIAL PRIMARY KEY,
    provider TEXT NOT NULL DEFAULT 'gmail',
    account TEXT NOT NULL,
    provider_message_id TEXT NOT NULL,
    provider_thread_id TEXT,
    sender TEXT,
    recipient TEXT,
    subject TEXT,
    body TEXT,
    received_at TIMESTAMPTZ,
    source TEXT,
    lead_email TEXT,
    status TEXT NOT NULL DEFAULT 'RECEIVED',
    idempotency_key TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(provider,account,provider_message_id),
    UNIQUE(idempotency_key)
  )`;
  await q`CREATE INDEX IF NOT EXISTS simon_inbox_messages_email_idx ON simon_inbox_messages(lead_email,created_at DESC)`;
  await q`CREATE TABLE IF NOT EXISTS simon_inbox_attachments (
    id BIGSERIAL PRIMARY KEY,
    inbox_message_id BIGINT NOT NULL REFERENCES simon_inbox_messages(id) ON DELETE CASCADE,
    provider_attachment_id TEXT,
    filename TEXT,
    mime_type TEXT,
    size_bytes BIGINT,
    drive_file_id TEXT,
    drive_url TEXT,
    status TEXT NOT NULL DEFAULT 'DISCOVERED',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(inbox_message_id,provider_attachment_id)
  )`;
  await q`CREATE TABLE IF NOT EXISTS simon_followup_drafts (
    id BIGSERIAL PRIMARY KEY,
    inbox_message_id BIGINT NOT NULL REFERENCES simon_inbox_messages(id) ON DELETE CASCADE,
    recipient_email TEXT,
    subject TEXT NOT NULL,
    draft_body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT_ONLY',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(inbox_message_id)
  )`;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as InboxMessage | null;
  if (!body?.account || !body?.message_id) {
    return NextResponse.json({ error: "account and message_id are required" }, { status: 400 });
  }

  await ensureInboxSchema();
  const q = sql();

  const provider = String(body.provider || "gmail").toLowerCase();
  const account = String(body.account).trim().toLowerCase();
  const messageId = String(body.message_id).trim();
  const leadEmail = normalizeEmail(body.lead_email || body.from);
  const key = idempotencyKey(["inbox_ingest", provider, account, messageId, "v2"]);
  const kind = classifyInbox(body);

  const inserted: any = await q`
    INSERT INTO simon_inbox_messages(
      provider,account,provider_message_id,provider_thread_id,sender,recipient,subject,body,
      received_at,source,lead_email,status,idempotency_key,metadata
    ) VALUES(
      ${provider},
      ${account},
      ${messageId},
      ${body.thread_id || null},
      ${body.from || null},
      ${body.to || null},
      ${body.subject || null},
      ${body.body || null},
      ${body.received_at || null},
      ${body.source || "SIMON_INBOX"},
      ${leadEmail || null},
      'RECEIVED',
      ${key},
      ${JSON.stringify({ ...(body.metadata || {}), inbox_kind: kind })}::jsonb
    )
    ON CONFLICT (provider,account,provider_message_id) DO NOTHING
    RETURNING id
  `;

  if (!inserted[0]) {
    const existing: any = await q`
      SELECT id,status FROM simon_inbox_messages
      WHERE provider=${provider} AND account=${account} AND provider_message_id=${messageId}
      LIMIT 1
    `;
    return NextResponse.json({
      ok: true,
      duplicate: true,
      inbox_message_id: Number(existing[0]?.id),
      status: existing[0]?.status || "RECEIVED",
      idempotency_key: key,
      inbox_kind: kind,
    });
  }

  const inboxId = Number(inserted[0].id);
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];

  for (let i = 0; i < attachments.length; i++) {
    const a = attachments[i];
    const attachmentId = String(a.attachment_id || `${i}:${a.filename || "attachment"}:${a.size || 0}`);
    await q`
      INSERT INTO simon_inbox_attachments(
        inbox_message_id,provider_attachment_id,filename,mime_type,size_bytes,drive_file_id,drive_url,status,metadata
      ) VALUES(
        ${inboxId},
        ${attachmentId},
        ${a.filename || null},
        ${a.mime_type || null},
        ${a.size || null},
        ${a.drive_file_id || null},
        ${a.drive_url || null},
        ${a.drive_file_id ? "FILED" : "DISCOVERED"},
        ${JSON.stringify({ ordinal: i })}::jsonb
      )
      ON CONFLICT (inbox_message_id,provider_attachment_id) DO NOTHING
    `;
  }

  let matchedLeadId: number | null = null;
  if (kind === "LEAD" && leadEmail) {
    const leads: any = await q`
      SELECT id FROM leads
      WHERE lower(coalesce(email,''))=${leadEmail}
      ORDER BY id ASC
      LIMIT 1
    `;
    if (leads[0]) matchedLeadId = Number(leads[0].id);
  }

  let followUpStatus = "NOT_APPLICABLE";
  if (kind === "LEAD") {
    const draftSubject = body.subject ? `Re: ${body.subject}` : "KMCE follow-up";
    const draftBody = inferDraft(body.subject || "");
    await q`
      INSERT INTO simon_followup_drafts(inbox_message_id,recipient_email,subject,draft_body,status)
      VALUES(${inboxId},${leadEmail || null},${draftSubject},${draftBody},'DRAFT_ONLY')
      ON CONFLICT (inbox_message_id) DO NOTHING
    `;
    followUpStatus = "DRAFT_ONLY";
  }

  const filedAttachments = attachments.filter(a => Boolean(a.drive_file_id));
  const driveAction =
    attachments.length === 0
      ? "NOT_APPLICABLE"
      : filedAttachments.length === attachments.length
        ? "COMPLETE_REUSED_OR_FILED"
        : "REQUIRED";
  const crmLinked = kind === "FACULTY_DOCUMENT"
    ? attachments.some(a => Boolean(a.crm_record_id))
    : false;
  const airtableAction =
    kind === "GENERAL"
      ? "REVIEW"
      : kind === "FACULTY_DOCUMENT" && crmLinked
        ? "COMPLETE_REUSED_EXISTING"
        : "QUEUED";

  await q`
    INSERT INTO agent_tasks(assigned_agent,title,instruction,status,source,requested_by)
    VALUES(
      'Simon',
      ${`Review ${kind.toLowerCase()} inbox: ${body.subject || messageId}`},
      ${`Inbound ${provider} message ${messageId} classified as ${kind}. Match existing CRM records before creating anything new. Attachments discovered: ${attachments.length}. Drive filing: ${driveAction}. Airtable sync: ${airtableAction}. External sends require founder approval.`},
      'QUEUED',
      'SIMON_INBOX',
      ${account}
    )
  `;

  return NextResponse.json({
    ok: true,
    duplicate: false,
    inbox_message_id: inboxId,
    idempotency_key: key,
    inbox_kind: kind,
    matched_lead_id: matchedLeadId,
    attachments_discovered: attachments.length,
    follow_up: { status: followUpStatus },
    document_handling: kind === "FACULTY_DOCUMENT" ? {
      duplicate_safe: true,
      attachments_total: attachments.length,
      attachments_already_filed: filedAttachments.length,
      existing_crm_record_reused: crmLinked,
      follow_up_draft_created: false,
    } : null,
    next_actions: {
      drive_filing: driveAction,
      airtable_sync: airtableAction,
      external_send: "BLOCKED_PENDING_FOUNDER_APPROVAL",
    },
  }, { status: 201 });
}
