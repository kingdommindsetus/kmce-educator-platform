from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from app.config import settings
from app.db import get_connection, init_db, PIPELINE_STAGES

app = FastAPI(title=settings.app_name, version="1.0.0")

def now_iso():
    return datetime.now(timezone.utc).isoformat()

@app.on_event("startup")
def startup():
    init_db()

@app.get("/health")
def health():
    return {"status": "ok", "app_name": settings.app_name}

class LeadCreate(BaseModel):
    educator_id: int
    practice_name: str = Field(min_length=2, max_length=200)
    decision_maker: str | None = None
    city: str | None = None
    state: str | None = None
    website: str | None = None
    phone: str | None = None
    email: str | None = None
    contact_form: str | None = None
    source: str | None = None
    evidence_url: str | None = None
    evidence: str | None = None

class StageChange(BaseModel):
    stage: str
    actor_type: str = "human"
    actor_name: str
    detail: str | None = None

class Approval(BaseModel):
    approved_by: str

@app.get("/educators/{educator_id}/commercial-summary")
def commercial_summary(educator_id: int):
    conn = get_connection()
    exists = conn.execute("SELECT id FROM educators WHERE id=?", (educator_id,)).fetchone()
    if not exists:
        conn.close(); raise HTTPException(404, "Educator not found")
    rows = conn.execute("SELECT pipeline_stage, COUNT(*) c FROM leads WHERE educator_id=? GROUP BY pipeline_stage", (educator_id,)).fetchall()
    revenue = conn.execute("SELECT COALESCE(SUM(revenue_cents),0) total FROM conversions WHERE educator_id=?", (educator_id,)).fetchone()["total"]
    appointments = conn.execute("SELECT COUNT(*) c FROM appointments WHERE educator_id=? AND status='BOOKED'", (educator_id,)).fetchone()["c"]
    conn.close()
    return {"educator_id": educator_id, "pipeline": {r["pipeline_stage"]: r["c"] for r in rows}, "booked_appointments": appointments, "attributed_revenue_cents": revenue}

@app.get("/educators/{educator_id}/leads")
def list_educator_leads(educator_id: int):
    conn = get_connection()
    rows = conn.execute("SELECT * FROM leads WHERE educator_id=? ORDER BY updated_at DESC", (educator_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/leads")
def create_lead(payload: LeadCreate):
    conn = get_connection()
    if not conn.execute("SELECT id FROM educators WHERE id=?", (payload.educator_id,)).fetchone():
        conn.close(); raise HTTPException(404, "Educator not found")
    ts = now_iso()
    try:
        cur = conn.execute("""INSERT INTO leads(
          educator_id,practice_name,decision_maker,city,state,website,phone,email,contact_form,
          source,evidence_url,evidence,pipeline_stage,created_at,updated_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
          payload.educator_id,payload.practice_name,payload.decision_maker,payload.city,payload.state,
          payload.website,payload.phone,payload.email,payload.contact_form,payload.source,payload.evidence_url,
          payload.evidence,"DISCOVERED",ts,ts))
    except Exception as exc:
        conn.close(); raise HTTPException(409, f"Lead could not be created: {exc}")
    lead_id=cur.lastrowid
    conn.execute("""INSERT INTO lead_activities(lead_id,educator_id,actor_type,actor_name,action,detail,to_stage,created_at)
                    VALUES(?,?,?,?,?,?,?,?)""",(lead_id,payload.educator_id,"system","KMCE","LEAD_CREATED","Lead created","DISCOVERED",ts))
    conn.commit(); conn.close()
    return {"id": lead_id, "pipeline_stage": "DISCOVERED"}

@app.post("/leads/{lead_id}/stage")
def change_stage(lead_id: int, payload: StageChange):
    if payload.stage not in PIPELINE_STAGES:
        raise HTTPException(400, "Invalid pipeline stage")
    conn=get_connection()
    lead=conn.execute("SELECT * FROM leads WHERE id=?",(lead_id,)).fetchone()
    if not lead:
        conn.close(); raise HTTPException(404,"Lead not found")
    old=lead["pipeline_stage"]; ts=now_iso()
    conn.execute("UPDATE leads SET pipeline_stage=?,last_activity_at=?,updated_at=? WHERE id=?",(payload.stage,ts,ts,lead_id))
    conn.execute("""INSERT INTO lead_activities(lead_id,educator_id,actor_type,actor_name,action,detail,from_stage,to_stage,created_at)
                    VALUES(?,?,?,?,?,?,?,?,?)""",(lead_id,lead["educator_id"],payload.actor_type,payload.actor_name,"STAGE_CHANGED",payload.detail,old,payload.stage,ts))
    conn.commit(); conn.close()
    return {"lead_id":lead_id,"from_stage":old,"to_stage":payload.stage}

@app.get("/leads/{lead_id}/activity")
def lead_activity(lead_id: int):
    conn=get_connection()
    rows=conn.execute("SELECT * FROM lead_activities WHERE lead_id=? ORDER BY created_at DESC",(lead_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/outreach/{job_id}/approve")
def approve_outreach(job_id: int, payload: Approval):
    conn=get_connection()
    job=conn.execute("SELECT * FROM outreach_jobs WHERE id=?",(job_id,)).fetchone()
    if not job:
        conn.close(); raise HTTPException(404,"Outreach job not found")
    if job["status"] != "PENDING_APPROVAL":
        conn.close(); raise HTTPException(409,"Only pending outreach can be approved")
    ts=now_iso()
    conn.execute("UPDATE outreach_jobs SET status='APPROVED',approved_by=?,approved_at=?,updated_at=? WHERE id=?",(payload.approved_by,ts,ts,job_id))
    conn.commit(); conn.close()
    return {"job_id":job_id,"status":"APPROVED","approved_by":payload.approved_by}

@app.get("/admin/approval-queue")
def approval_queue():
    conn=get_connection()
    rows=conn.execute("""SELECT o.*, l.practice_name, c.name campaign_name, e.public_name educator_name
                         FROM outreach_jobs o
                         JOIN leads l ON l.id=o.lead_id
                         JOIN campaigns c ON c.id=o.campaign_id
                         JOIN educators e ON e.id=l.educator_id
                         WHERE o.status='PENDING_APPROVAL' ORDER BY o.created_at""").fetchall()
    conn.close()
    return [dict(r) for r in rows]


class Rejection(BaseModel):
    rejected_by: str
    reason: str = Field(min_length=2, max_length=500)

@app.post("/outreach/{job_id}/reject")
def reject_outreach(job_id: int, payload: Rejection):
    conn=get_connection()
    job=conn.execute("""SELECT o.*, l.educator_id FROM outreach_jobs o
                        JOIN leads l ON l.id=o.lead_id WHERE o.id=?""",(job_id,)).fetchone()
    if not job:
        conn.close(); raise HTTPException(404,"Outreach job not found")
    if job["status"] != "PENDING_APPROVAL":
        conn.close(); raise HTTPException(409,"Only pending outreach can be rejected")
    ts=now_iso()
    conn.execute("UPDATE outreach_jobs SET status='REJECTED',updated_at=? WHERE id=?",(ts,job_id))
    conn.execute("UPDATE leads SET approval_status='REJECTED',pipeline_stage='OUTREACH_READY',assigned_agent='Maven',updated_at=? WHERE id=?",(ts,job["lead_id"]))
    conn.execute("""INSERT INTO lead_activities(lead_id,educator_id,actor_type,actor_name,action,detail,from_stage,to_stage,created_at)
                    VALUES(?,?,?,?,?,?,?,?,?)""",(job["lead_id"],job["educator_id"],"human",payload.rejected_by,
                    "OUTREACH_REJECTED",payload.reason,"PENDING_APPROVAL","OUTREACH_READY",ts))
    conn.commit(); conn.close()
    return {"job_id":job_id,"status":"REJECTED","reason":payload.reason}
