from app.db import get_connection
from datetime import datetime, timezone

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def build_draft(lead):
    name = lead["decision_maker"] or "Doctor"
    fit = lead["evidence"] or "your work in airway-focused dentistry"
    return f"""Subject: Phoenix education opportunity with Dr. Timothy Adams

Hello {name},

I'm reaching out from Kingdom Mindset CE regarding Dr. Timothy Adams, DDS, D.ASBA, D.ACSDD and his educational program, Craniofacial Biodentistry & Advanced Airway Integration.

Your practice stood out to our team because of {fit}

We're currently building the Phoenix interest list and would be glad to send details as they are finalized. Event date, CE hours, and tuition are still pending, so I don't want to give you information that has not been confirmed.

Would you like us to send the finalized program information when it is available?

Kingdom Mindset CE
AGD PACE Provider #441585"""

def create_approval_queue():
    conn=get_connection(); ts=now_iso()
    campaign=conn.execute("SELECT * FROM campaigns WHERE name='Dr. Timothy Adams — Phoenix Pilot 10'").fetchone()
    if not campaign:
        conn.close(); raise RuntimeError("Phoenix Pilot 10 campaign not seeded")
    leads=conn.execute("""SELECT l.* FROM leads l JOIN campaign_leads cl ON cl.lead_id=l.id
                          WHERE cl.campaign_id=? AND l.pipeline_stage='QUALIFIED'""",(campaign["id"],)).fetchall()
    created=0
    for lead in leads:
        existing=conn.execute("SELECT id FROM outreach_jobs WHERE campaign_id=? AND lead_id=? AND channel='email'",
                              (campaign["id"],lead["id"])).fetchone()
        if existing: continue
        conn.execute("""INSERT INTO outreach_jobs(campaign_id,lead_id,channel,status,draft_content,created_at,updated_at)
                        VALUES(?,?,?,'PENDING_APPROVAL',?,?,?)""",(campaign["id"],lead["id"],"email",build_draft(lead),ts,ts))
        conn.execute("UPDATE leads SET pipeline_stage='PENDING_APPROVAL',approval_status='PENDING',assigned_agent='Gatekeeper',updated_at=? WHERE id=?",(ts,lead["id"]))
        conn.execute("""INSERT INTO lead_activities(lead_id,educator_id,actor_type,actor_name,action,detail,from_stage,to_stage,created_at)
                        VALUES(?,?,?,?,?,?,?,?,?)""",(lead["id"],lead["educator_id"],"agent","Maven/Gatekeeper","OUTREACH_DRAFTED",
                        "Personalized draft created and held for founder approval.","QUALIFIED","PENDING_APPROVAL",ts))
        created += 1
    conn.commit(); conn.close()
    return {"campaign_id":campaign["id"],"created":created,"status":"PENDING_APPROVAL"}

if __name__ == "__main__":
    print(create_approval_queue())
