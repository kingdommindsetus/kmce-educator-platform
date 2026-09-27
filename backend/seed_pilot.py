import json
from datetime import datetime, timezone
from pathlib import Path
from app.db import get_connection, init_db

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def seed(path="data/dr-tim-phoenix-pilot-10.json"):
    payload=json.loads(Path(path).read_text())
    init_db(); conn=get_connection(); ts=now_iso()
    org=payload["organization"]
    conn.execute("INSERT OR IGNORE INTO organizations(name,slug,created_at) VALUES(?,?,?)",(org["name"],org["slug"],ts))
    org_id=conn.execute("SELECT id FROM organizations WHERE slug=?",(org["slug"],)).fetchone()["id"]

    e=payload["educator"]
    row=conn.execute("SELECT id FROM educators WHERE organization_id=? AND legal_name=?",(org_id,e["legal_name"])).fetchone()
    if row: educator_id=row["id"]
    else:
        cur=conn.execute("""INSERT INTO educators(organization_id,legal_name,public_name,credentials,professional_title,status,created_at,updated_at)
                            VALUES(?,?,?,?,?,?,?,?)""",(org_id,e["legal_name"],e["public_name"],e["credentials"],e["professional_title"],e["status"],ts,ts))
        educator_id=cur.lastrowid

    c=payload["course"]
    row=conn.execute("SELECT id FROM courses WHERE educator_id=? AND title=?",(educator_id,c["title"])).fetchone()
    if row: course_id=row["id"]
    else:
        cur=conn.execute("""INSERT INTO courses(educator_id,title,course_status,approved_ce_hours,tuition,venue,event_date,created_at,updated_at)
                            VALUES(?,?,?,?,?,?,?,?,?)""",(educator_id,c["title"],c["course_status"],c["approved_ce_hours"],c["tuition"],c["venue"],c["event_date"],ts,ts))
        course_id=cur.lastrowid

    camp=payload["campaign"]
    row=conn.execute("SELECT id FROM campaigns WHERE educator_id=? AND name=?",(educator_id,camp["name"])).fetchone()
    if row: campaign_id=row["id"]
    else:
        cur=conn.execute("""INSERT INTO campaigns(educator_id,course_id,name,offer,audience,cta,status,created_at,updated_at)
                            VALUES(?,?,?,?,?,?,?,?,?)""",(educator_id,course_id,camp["name"],camp["offer"],camp["audience"],camp["cta"],camp["status"],ts,ts))
        campaign_id=cur.lastrowid

    for lead in payload["leads"]:
        row=conn.execute("SELECT id FROM leads WHERE educator_id=? AND practice_name=? AND city=? AND state=?",
                         (educator_id,lead["practice_name"],lead["city"],lead["state"])).fetchone()
        if row: lead_id=row["id"]
        else:
            cur=conn.execute("""INSERT INTO leads(
              educator_id,practice_name,decision_maker,city,state,website,phone,email,contact_form,source,evidence_url,evidence,
              contact_verified,verified_at,qualification_score,qualification_reason,pipeline_stage,assigned_agent,created_at,updated_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",(
              educator_id,lead["practice_name"],lead.get("decision_maker"),lead["city"],lead["state"],lead.get("website"),lead.get("phone"),
              lead.get("email"),lead.get("contact_form"),lead["source"],lead["evidence_url"],lead["evidence"],1 if lead["contact_verified"] else 0,
              ts,lead["qualification_score"],lead["qualification_reason"],lead["pipeline_stage"],lead["assigned_agent"],ts,ts))
            lead_id=cur.lastrowid
            conn.execute("""INSERT INTO lead_activities(lead_id,educator_id,actor_type,actor_name,action,detail,to_stage,source_url,created_at)
                            VALUES(?,?,?,?,?,?,?,?,?)""",(lead_id,educator_id,"agent","Scout/Claire/Atlas","PILOT_LEAD_QUALIFIED",
                            lead["qualification_reason"],lead["pipeline_stage"],lead["evidence_url"],ts))
        conn.execute("INSERT OR IGNORE INTO campaign_leads(campaign_id,lead_id,added_at) VALUES(?,?,?)",(campaign_id,lead_id,ts))
    conn.commit()
    count=conn.execute("SELECT COUNT(*) c FROM campaign_leads WHERE campaign_id=?",(campaign_id,)).fetchone()["c"]
    conn.close()
    return {"educator_id":educator_id,"course_id":course_id,"campaign_id":campaign_id,"pilot_leads":count}

if __name__ == "__main__":
    print(seed())
