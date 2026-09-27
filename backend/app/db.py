import sqlite3
from app.config import settings

PIPELINE_STAGES = (
    "DISCOVERED","ENRICHING","QUALIFIED","OUTREACH_READY","PENDING_APPROVAL",
    "APPROVED","CONTACTED","FOLLOW_UP","REPLIED","INTERESTED","CALL_BOOKED",
    "OPPORTUNITY","CONVERTED","CLOSED","NOT_A_FIT","DO_NOT_CONTACT","BOUNCED"
)

def get_connection():
    conn = sqlite3.connect(settings.database_url.replace("sqlite:///", ""))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_connection()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS educators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL,
      legal_name TEXT NOT NULL,
      public_name TEXT,
      credentials TEXT,
      professional_title TEXT,
      specialty TEXT,
      email TEXT,
      phone TEXT,
      city TEXT,
      state TEXT,
      country TEXT,
      bio_short TEXT,
      bio_full TEXT,
      status TEXT NOT NULL DEFAULT 'INVITED',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      educator_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      course_status TEXT NOT NULL DEFAULT 'DRAFT',
      topic TEXT,
      target_audience TEXT,
      requested_ce_hours REAL,
      approved_ce_hours REAL,
      tuition TEXT,
      venue TEXT,
      event_date TEXT,
      registration_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (educator_id) REFERENCES educators(id)
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      educator_id INTEGER NOT NULL,
      practice_name TEXT NOT NULL,
      decision_maker TEXT,
      city TEXT,
      state TEXT,
      website TEXT,
      phone TEXT,
      email TEXT,
      contact_form TEXT,
      source TEXT,
      evidence_url TEXT,
      evidence TEXT,
      contact_verified INTEGER NOT NULL DEFAULT 0,
      verified_at TEXT,
      qualification_score INTEGER,
      qualification_reason TEXT,
      pipeline_stage TEXT NOT NULL DEFAULT 'DISCOVERED',
      assigned_agent TEXT,
      last_activity_at TEXT,
      next_action TEXT,
      next_action_at TEXT,
      approval_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (educator_id) REFERENCES educators(id),
      UNIQUE (educator_id, practice_name, city, state)
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      educator_id INTEGER NOT NULL,
      course_id INTEGER,
      name TEXT NOT NULL,
      offer TEXT NOT NULL,
      audience TEXT NOT NULL,
      cta TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (educator_id) REFERENCES educators(id),
      FOREIGN KEY (course_id) REFERENCES courses(id)
    );

    CREATE TABLE IF NOT EXISTS campaign_leads (
      campaign_id INTEGER NOT NULL,
      lead_id INTEGER NOT NULL,
      added_at TEXT NOT NULL,
      PRIMARY KEY (campaign_id, lead_id),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );

    CREATE TABLE IF NOT EXISTS lead_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      educator_id INTEGER NOT NULL,
      actor_type TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      action TEXT NOT NULL,
      detail TEXT,
      from_stage TEXT,
      to_stage TEXT,
      source_url TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES leads(id),
      FOREIGN KEY (educator_id) REFERENCES educators(id)
    );

    CREATE TABLE IF NOT EXISTS outreach_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      lead_id INTEGER NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
      draft_content TEXT,
      approved_by TEXT,
      approved_at TEXT,
      sent_at TEXT,
      external_message_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      educator_id INTEGER NOT NULL,
      lead_id INTEGER NOT NULL,
      campaign_id INTEGER,
      starts_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'BOOKED',
      meeting_url TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (educator_id) REFERENCES educators(id),
      FOREIGN KEY (lead_id) REFERENCES leads(id),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    );

    CREATE TABLE IF NOT EXISTS conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      educator_id INTEGER NOT NULL,
      lead_id INTEGER NOT NULL,
      campaign_id INTEGER,
      conversion_type TEXT NOT NULL,
      revenue_cents INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      source_reference TEXT,
      converted_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (educator_id) REFERENCES educators(id),
      FOREIGN KEY (lead_id) REFERENCES leads(id),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    );

    CREATE TABLE IF NOT EXISTS agent_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      educator_id INTEGER,
      lead_id INTEGER,
      campaign_id INTEGER,
      agent_name TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      input_summary TEXT,
      output_summary TEXT,
      requires_human_approval INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (educator_id) REFERENCES educators(id),
      FOREIGN KEY (lead_id) REFERENCES leads(id),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    );

    CREATE INDEX IF NOT EXISTS idx_leads_educator_stage ON leads(educator_id, pipeline_stage);
    CREATE INDEX IF NOT EXISTS idx_activity_lead_time ON lead_activities(lead_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_educator ON agent_runs(educator_id, created_at);
    """)
    conn.commit()
    conn.close()
