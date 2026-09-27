import json
from pathlib import Path

def test_pilot_10_is_complete_and_safe():
    p=Path(__file__).resolve().parents[2]/"data"/"dr-tim-phoenix-pilot-10.json"
    data=json.loads(p.read_text())
    assert len(data["leads"]) == 10
    assert data["course"]["event_date"] is None
    assert data["course"]["approved_ce_hours"] is None
    assert data["course"]["tuition"] is None
    for lead in data["leads"]:
        assert lead["evidence_url"]
        assert lead["contact_verified"] is True
        assert lead["qualification_score"] >= 5
        assert lead["pipeline_stage"] == "QUALIFIED"
        if lead.get("email"):
            assert "@" in lead["email"]
