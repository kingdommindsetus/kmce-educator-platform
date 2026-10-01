import { NextResponse } from "next/server";
import { POST as ingest } from "../ingest/route";

export const runtime = "nodejs";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Preview only" }, { status: 404 });
  }
  const secret = process.env.SIMON_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "SIMON_WEBHOOK_SECRET missing" }, { status: 500 });

  const unique = Date.now().toString(36);

  const leadPayload = {
    account: "qa@kingdommindsetce.test",
    provider: "gmail",
    message_id: `qa-simon-lead-${unique}`,
    thread_id: `qa-thread-lead-${unique}`,
    from: "qa-lead@example.com",
    to: "qa@kingdommindsetce.test",
    subject: "Contact Form Interest",
    body: "Synthetic lead acceptance test. No external send.",
    source: "FORMSPREE_LEAD",
    attachments: [],
    metadata: { synthetic: true, acceptance_test: "inbox_v3" }
  };

  const facultyPayload = {
    account: "qa@kingdommindsetce.test",
    provider: "gmail",
    message_id: `qa-simon-faculty-${unique}`,
    thread_id: `qa-thread-faculty-${unique}`,
    from: "qa-faculty@example.com",
    to: "qa@kingdommindsetce.test",
    subject: "Signed Agreement",
    body: "Synthetic faculty document test. No external send.",
    source: "SIMON_SELF_TEST",
    attachments: [{
      attachment_id: `qa-attachment-${unique}`,
      filename: "signed-agreement.pdf",
      mime_type: "application/pdf",
      size: 1234
    }],
    metadata: { synthetic: true, acceptance_test: "inbox_v3" }
  };

  const makeReq = (payload: unknown) => new Request("https://internal.test/api/simon/inbox/ingest", {
    method: "POST",
    headers: { "content-type": "application/json", "x-simon-webhook-secret": secret },
    body: JSON.stringify(payload)
  });

  const leadFirstRes = await ingest(makeReq(leadPayload));
  const leadFirst = await leadFirstRes.json();
  const leadSecondRes = await ingest(makeReq(leadPayload));
  const leadSecond = await leadSecondRes.json();
  const facultyRes = await ingest(makeReq(facultyPayload));
  const faculty = await facultyRes.json();

  const passed =
    leadFirst?.ok === true &&
    leadFirst?.duplicate === false &&
    leadFirst?.inbox_kind === "LEAD" &&
    leadFirst?.follow_up?.status === "DRAFT_ONLY" &&
    leadSecond?.duplicate === true &&
    leadFirst?.inbox_message_id === leadSecond?.inbox_message_id &&
    faculty?.ok === true &&
    faculty?.inbox_kind === "FACULTY_DOCUMENT" &&
    faculty?.follow_up?.status === "NOT_APPLICABLE" &&
    faculty?.next_actions?.external_send === "BLOCKED_PENDING_FOUNDER_APPROVAL";

  return NextResponse.json({
    ok: passed,
    test: "SIMON_INBOX_V3",
    lead: {
      first_status: leadFirstRes.status,
      duplicate_first: leadFirst?.duplicate,
      duplicate_second: leadSecond?.duplicate,
      inbox_message_id: leadFirst?.inbox_message_id,
      kind: leadFirst?.inbox_kind,
      follow_up: leadFirst?.follow_up?.status
    },
    faculty: {
      status: facultyRes.status,
      kind: faculty?.inbox_kind,
      follow_up: faculty?.follow_up?.status,
      drive_filing: faculty?.next_actions?.drive_filing,
      external_send: faculty?.next_actions?.external_send
    }
  }, { status: passed ? 200 : 500 });
}
