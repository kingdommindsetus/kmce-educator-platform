import asyncio
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from app.config import settings
from app.db import get_connection, init_db, PIPELINE_STAGES
from app.video_service import VideoGenerationService

app = FastAPI(title=settings.app_name, version="1.0.0")
video_service = VideoGenerationService()

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


class DraftEdit(BaseModel):
    edited_by: str
    draft_content: str = Field(min_length=10, max_length=10000)
    note: str | None = None

class VideoGenerationRequest(BaseModel):
    prompt: str = Field(min_length=10, max_length=5000)
    title: str | None = None
    campaign_id: int | None = None
    duration_seconds: int = 60

class VideoGenerationResponse(BaseModel):
    job_id: int
    status: str
    educator_id: int
    created_at: str

@app.get("/admin/educators")
def admin_educators():
    conn=get_connection()
    rows=conn.execute("""SELECT e.*,
      (SELECT COUNT(*) FROM leads l WHERE l.educator_id=e.id) lead_count,
      (SELECT COUNT(*) FROM courses c WHERE c.educator_id=e.id) course_count,
      (SELECT COALESCE(SUM(cv.revenue_cents),0) FROM conversions cv WHERE cv.educator_id=e.id) revenue_cents
      FROM educators e ORDER BY e.public_name, e.legal_name""").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/admin/educators/{educator_id}/workspace")
def educator_workspace(educator_id: int):
    conn=get_connection()
    educator=conn.execute("SELECT * FROM educators WHERE id=?",(educator_id,)).fetchone()
    if not educator:
        conn.close(); raise HTTPException(404,"Educator not found")
    leads=conn.execute("SELECT * FROM leads WHERE educator_id=? ORDER BY updated_at DESC",(educator_id,)).fetchall()
    courses=conn.execute("SELECT * FROM courses WHERE educator_id=? ORDER BY updated_at DESC",(educator_id,)).fetchall()
    campaigns=conn.execute("SELECT * FROM campaigns WHERE educator_id=? ORDER BY updated_at DESC",(educator_id,)).fetchall()
    pending=conn.execute("""SELECT o.*,l.practice_name,l.decision_maker,l.email,l.phone
                            FROM outreach_jobs o JOIN leads l ON l.id=o.lead_id
                            JOIN campaigns c ON c.id=o.campaign_id
                            WHERE c.educator_id=? AND o.status='PENDING_APPROVAL'
                            ORDER BY o.created_at""",(educator_id,)).fetchall()
    conn.close()
    return {"educator":dict(educator),"leads":[dict(r) for r in leads],"courses":[dict(r) for r in courses],
            "campaigns":[dict(r) for r in campaigns],"pending_approvals":[dict(r) for r in pending]}

@app.get("/admin/leads/{lead_id}")
def admin_lead_detail(lead_id: int):
    conn=get_connection()
    lead=conn.execute("SELECT * FROM leads WHERE id=?",(lead_id,)).fetchone()
    if not lead:
        conn.close(); raise HTTPException(404,"Lead not found")
    activity=conn.execute("SELECT * FROM lead_activities WHERE lead_id=? ORDER BY created_at DESC",(lead_id,)).fetchall()
    outreach=conn.execute("SELECT * FROM outreach_jobs WHERE lead_id=? ORDER BY created_at DESC",(lead_id,)).fetchall()
    conn.close()
    return {"lead":dict(lead),"activity":[dict(r) for r in activity],"outreach":[dict(r) for r in outreach]}

@app.patch("/outreach/{job_id}/draft")
def edit_outreach_draft(job_id: int, payload: DraftEdit):
    conn=get_connection()
    job=conn.execute("""SELECT o.*,l.educator_id FROM outreach_jobs o JOIN leads l ON l.id=o.lead_id WHERE o.id=?""",(job_id,)).fetchone()
    if not job:
        conn.close(); raise HTTPException(404,"Outreach job not found")
    if job["status"] != "PENDING_APPROVAL":
        conn.close(); raise HTTPException(409,"Only pending drafts may be edited")
    ts=now_iso()
    conn.execute("UPDATE outreach_jobs SET draft_content=?,updated_at=? WHERE id=?",(payload.draft_content,ts,job_id))
    conn.execute("""INSERT INTO lead_activities(lead_id,educator_id,actor_type,actor_name,action,detail,created_at)
                    VALUES(?,?,?,?,?,?,?)""",(job["lead_id"],job["educator_id"],"human",payload.edited_by,"OUTREACH_DRAFT_EDITED",
                    payload.note or "Founder edited pending outreach draft.",ts))
    conn.commit(); conn.close()
    return {"job_id":job_id,"status":"PENDING_APPROVAL","updated_at":ts}

@app.post("/educators/{educator_id}/videos/generate")
def create_video(educator_id: int, payload: VideoGenerationRequest, background_tasks: BackgroundTasks):
    conn = get_connection()
    educator = conn.execute("SELECT id FROM educators WHERE id = ?", (educator_id,)).fetchone()
    if not educator:
        conn.close()
        raise HTTPException(404, "Educator not found")
    conn.close()

    job = video_service.create_video_job(
        educator_id=educator_id,
        prompt=payload.prompt,
        title=payload.title,
        campaign_id=payload.campaign_id,
        duration_seconds=payload.duration_seconds,
    )

    background_tasks.add_task(
        asyncio.run,
        video_service.generate_video(
            job["id"], payload.prompt, payload.duration_seconds
        ),
    )

    return VideoGenerationResponse(**job)

@app.get("/educators/{educator_id}/videos")
def list_educator_videos(educator_id: int, limit: int = 20):
    conn = get_connection()
    educator = conn.execute("SELECT id FROM educators WHERE id = ?", (educator_id,)).fetchone()
    if not educator:
        conn.close()
        raise HTTPException(404, "Educator not found")
    conn.close()

    videos = video_service.list_educator_videos(educator_id, limit)
    return videos

@app.get("/videos/job/{job_id}")
def get_video_job(job_id: int):
    job = video_service.get_video_job(job_id)
    if not job:
        raise HTTPException(404, "Video job not found")
    return job

@app.post("/videos/job/{job_id}/link-to-outreach/{outreach_job_id}")
def link_video_to_outreach(job_id: int, outreach_job_id: int):
    conn = get_connection()
    outreach_job = conn.execute(
        "SELECT educator_id FROM outreach_jobs WHERE id = ?", (outreach_job_id,)
    ).fetchone()
    if not outreach_job:
        conn.close()
        raise HTTPException(404, "Outreach job not found")

    video_job = video_service.get_video_job(job_id)
    if not video_job:
        conn.close()
        raise HTTPException(404, "Video job not found")

    conn.close()

    success = video_service.link_video_to_outreach(
        job_id, outreach_job_id, outreach_job["educator_id"]
    )
    if not success:
        raise HTTPException(400, "Failed to link video to outreach")

    return {"status": "linked", "video_job_id": job_id, "outreach_job_id": outreach_job_id}
