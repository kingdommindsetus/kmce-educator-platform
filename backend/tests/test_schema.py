import os, sys, tempfile
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import db

def test_commercial_schema_and_approval_default():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    original = db.settings.database_url
    try:
        db.settings.database_url = f"sqlite:///{path}"
        db.init_db()
        conn = db.get_connection()
        tables = {r["name"] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        required = {"organizations","educators","courses","leads","campaigns","campaign_leads","lead_activities","outreach_jobs","appointments","conversions","agent_runs"}
        assert required.issubset(tables)

        conn.execute("INSERT INTO organizations(name,slug,created_at) VALUES('Kingdom Mindset CE','kmce','now')")
        org_id = conn.execute("SELECT id FROM organizations").fetchone()["id"]
        conn.execute("""INSERT INTO educators(organization_id,legal_name,public_name,credentials,status,created_at,updated_at)
                        VALUES(?,?,?,?,?,?,?)""",(org_id,"Timothy Adams","Dr. Timothy Adams","DDS, D.ASBA, D.ACSDD","ACTIVE","now","now"))
        educator_id=conn.execute("SELECT id FROM educators").fetchone()["id"]
        conn.execute("""INSERT INTO leads(educator_id,practice_name,pipeline_stage,created_at,updated_at)
                        VALUES(?,?,?,?,?)""",(educator_id,"Pilot Practice","QUALIFIED","now","now"))
        lead_id=conn.execute("SELECT id FROM leads").fetchone()["id"]
        conn.execute("""INSERT INTO campaigns(educator_id,name,offer,audience,cta,status,created_at,updated_at)
                        VALUES(?,?,?,?,?,?,?,?)""",(educator_id,"Phoenix Pilot","Dr. Tim education","Phoenix dental practices","Request information","DRAFT","now","now"))
        campaign_id=conn.execute("SELECT id FROM campaigns").fetchone()["id"]
        conn.execute("""INSERT INTO outreach_jobs(campaign_id,lead_id,channel,draft_content,created_at,updated_at)
                        VALUES(?,?,?,?,?,?)""",(campaign_id,lead_id,"email","Draft only","now","now"))
        status=conn.execute("SELECT status FROM outreach_jobs").fetchone()["status"]
        assert status == "PENDING_APPROVAL"
        conn.close()
    finally:
        db.settings.database_url = original
        if os.path.exists(path): os.unlink(path)
