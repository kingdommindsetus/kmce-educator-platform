import { NextResponse } from "next/server";
import { POST as ingest } from "../ingest/route";

export const runtime = "nodejs";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Preview only" }, { status: 404 });
  }
  const secret = process.env.SIMON_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "SIMON_WEBHOOK_SECRET missing" }, { status: 500 });

  const payload = {
    account: "qa@kingdommindsetce.test",
    provider: "gmail",
    message_id: "qa-simon-inbox-dedupe-v2",
    thread_id: "qa-thread-v2",
    from: "qa-lead@example.com",
    to: "qa@kingdommindsetce.test",
    subject: "QA Simon Inbox Idempotency",
    body: "Synthetic acceptance test. No external send.",
    source: "SIMON_SELF_TEST",
    attachments: [{
      attachment_id: "qa-attachment-v2",
      filename: "qa-test.pdf",
      mime_type: "application/pdf",
      size: 1234
    }],
    metadata: { synthetic: true, acceptance_test: "inbox_dedupe_v2" }
  };

  const makeReq = () => new Request("https://internal.test/api/simon/inbox/ingest", {
    method: "POST",
    headers: { "content-type": "application/json", "x-simon-webhook-secret": secret },
    body: JSON.stringify(payload)
  });

  const firstRes = await ingest(makeReq());
  const first = await firstRes.json();
  const secondRes = await ingest(makeReq());
  const second = await secondRes.json();

  const passed =
    first?.ok === true &&
    first?.duplicate === false &&
    second?.ok === true &&
    second?.duplicate === true &&
    first?.inbox_message_id === second?.inbox_message_id;

  return NextResponse.json({
    ok: passed,
    test: "SIMON_INBOX_IDEMPOTENCY",
    first: {
      status: firstRes.status,
      duplicate: first?.duplicate,
      inbox_message_id: first?.inbox_message_id,
      attachments_discovered: first?.attachments_discovered,
      follow_up: first?.follow_up,
      external_send: first?.next_actions?.external_send
    },
    second: {
      status: secondRes.status,
      duplicate: second?.duplicate,
      inbox_message_id: second?.inbox_message_id
    }
  }, { status: passed ? 200 : 500 });
}
